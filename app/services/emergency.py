import math
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.elder import Elder
from app.models.emergency import (
    EmergencyLog,
    EmergencyStage,
    EmergencyStageUpdate,
    EmergencyStatus,
    EmergencyWorkerCandidate,
)
from app.models.user import Role, User
from app.models.visit import Visit, VisitStatus
from app.schemas.emergency import (
    EmergencyPaymentRequest,
    EmergencyPaymentResponse,
    EmergencyResolveRequest,
    EmergencyStageUpdateRequest,
    EmergencyTriggerRequest,
)
from app.services.communications import get_admin_alert_emails, queue_email, queue_sms
from app.services.notification import connection_manager
from app.tasks.celery_app import celery_app


EMERGENCY_RELATIONSHIP_OPTIONS = (
    selectinload(EmergencyLog.elder).selectinload(Elder.customer),
    selectinload(EmergencyLog.triggered_by),
    selectinload(EmergencyLog.assigned_worker),
    selectinload(EmergencyLog.responder),
    selectinload(EmergencyLog.stage_updates).selectinload(EmergencyStageUpdate.updated_by),
    selectinload(EmergencyLog.worker_candidates).selectinload(EmergencyWorkerCandidate.worker),
)

WORKER_STAGE_TRANSITIONS: dict[EmergencyStage, set[EmergencyStage]] = {
    EmergencyStage.WORKER_ASSIGNED: {
        EmergencyStage.WORKER_ACCEPTED,
        EmergencyStage.WORKER_DELAYED_TRAFFIC,
        EmergencyStage.WORKER_DELAYED_ON_VISIT,
    },
    EmergencyStage.WORKER_ACCEPTED: {
        EmergencyStage.WORKER_ON_THE_WAY,
        EmergencyStage.WORKER_DELAYED_TRAFFIC,
        EmergencyStage.WORKER_DELAYED_ON_VISIT,
    },
    EmergencyStage.WORKER_DELAYED_TRAFFIC: {
        EmergencyStage.WORKER_ON_THE_WAY,
        EmergencyStage.WORKER_REACHED,
    },
    EmergencyStage.WORKER_DELAYED_ON_VISIT: {
        EmergencyStage.WORKER_ACCEPTED,
        EmergencyStage.WORKER_ON_THE_WAY,
    },
    EmergencyStage.WORKER_ON_THE_WAY: {
        EmergencyStage.WORKER_REACHED,
        EmergencyStage.WORKER_DELAYED_TRAFFIC,
    },
    EmergencyStage.WORKER_REACHED: {
        EmergencyStage.WORK_IN_PROGRESS,
    },
    EmergencyStage.WORK_IN_PROGRESS: {
        EmergencyStage.RESOLVED,
    },
}


def _normalize_address(address: str) -> str:
    return " ".join(address.strip().lower().split())


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * radius_km * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _append_stage_update(
    session: AsyncSession,
    *,
    log: EmergencyLog,
    stage: EmergencyStage,
    note: str | None,
    updated_by_id: int | None,
) -> EmergencyStageUpdate:
    log.current_stage = stage
    if stage == EmergencyStage.RESOLVED:
        log.status = EmergencyStatus.RESPONDED
        log.resolution_time = datetime.now(UTC)
    update = EmergencyStageUpdate(
        emergency_log_id=log.id,
        stage=stage,
        note=note,
        updated_by_id=updated_by_id,
    )
    session.add(update)
    return update


def _default_stage_note(stage: EmergencyStage, *, actor_name: str | None = None) -> str:
    actor_prefix = actor_name or "Worker"
    notes = {
        EmergencyStage.ADMIN_NOTIFIED: "Admin panel notified.",
        EmergencyStage.WORKER_ASSIGNED: "Nearest worker auto-assigned.",
        EmergencyStage.WORKER_ACCEPTED: f"{actor_prefix} accepted the SOS duty.",
        EmergencyStage.WORKER_DELAYED_TRAFFIC: f"{actor_prefix} reported traffic delay but is still assigned.",
        EmergencyStage.WORKER_DELAYED_ON_VISIT: f"{actor_prefix} reported they are wrapping up another visit.",
        EmergencyStage.WORKER_ON_THE_WAY: f"{actor_prefix} is on the way.",
        EmergencyStage.WORKER_REACHED: f"{actor_prefix} reached the location.",
        EmergencyStage.WORK_IN_PROGRESS: f"{actor_prefix} started on-site emergency support.",
        EmergencyStage.RESOLVED: f"{actor_prefix} marked the emergency as resolved.",
        EmergencyStage.NO_WORKER_AVAILABLE: "No available worker found for immediate dispatch.",
    }
    return notes.get(stage, stage.value)


async def _resolve_location_elders(
    session: AsyncSession,
    *,
    user: User,
    payload: EmergencyTriggerRequest,
) -> list[Elder]:
    result = await session.execute(select(Elder))
    elders = result.scalars().all()
    if user.role == Role.CUSTOMER:
        elders = [item for item in elders if item.customer_id == user.id]
    elif user.role == Role.WORKER:
        elders = [item for item in elders if item.assigned_worker_id == user.id]

    if payload.elder_id is not None:
        anchor = next((item for item in elders if item.id == payload.elder_id), None)
        if anchor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")
        location_key = _normalize_address(anchor.home_address)
    elif payload.location_address:
        location_key = _normalize_address(payload.location_address)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Location is required")

    location_elders = [item for item in elders if _normalize_address(item.home_address) == location_key]
    if not location_elders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location_elders


async def _find_nearest_available_workers(
    session: AsyncSession,
    *,
    latitude: float,
    longitude: float,
) -> list[tuple[User, float]]:
    workers_result = await session.execute(
        select(User).where(
            User.role == Role.WORKER,
            User.is_active.is_(True),
            User.is_verified.is_(True),
            User.available_for_dispatch.is_(True),
            User.current_latitude.is_not(None),
            User.current_longitude.is_not(None),
        )
    )
    workers = workers_result.scalars().all()
    if not workers:
        return []

    active_visit_result = await session.execute(
        select(Visit.worker_id).where(Visit.status == VisitStatus.ACTIVE)
    )
    busy_by_visit = {item[0] for item in active_visit_result.all()}

    active_emergency_result = await session.execute(
        select(EmergencyLog.assigned_worker_id).where(
            EmergencyLog.assigned_worker_id.is_not(None),
            EmergencyLog.status == EmergencyStatus.PENDING,
        )
    )
    busy_by_emergency = {item[0] for item in active_emergency_result.all() if item[0] is not None}
    busy_workers = busy_by_visit | busy_by_emergency

    ranked_workers: list[tuple[User, float]] = []
    for worker in workers:
        if worker.id in busy_workers:
            continue
        distance_km = _haversine_km(
            latitude,
            longitude,
            worker.current_latitude,
            worker.current_longitude,
        )
        ranked_workers.append((worker, distance_km))
    ranked_workers.sort(key=lambda item: item[1])
    return ranked_workers[:10]


async def _release_other_worker_candidates(
    session: AsyncSession,
    *,
    log: EmergencyLog,
    accepted_worker_id: int,
) -> None:
    for candidate in log.worker_candidates:
        if candidate.worker_id == accepted_worker_id:
            candidate.status = "ACCEPTED"
            candidate.siren_active = False
            candidate.accepted_at = datetime.now(UTC)
            continue
        if candidate.status != "RELEASED":
            candidate.status = "RELEASED"
            candidate.siren_active = False
            candidate.released_at = datetime.now(UTC)


def _build_emergency_payload(log: EmergencyLog, elder: Elder, message: str, *, event_type: str) -> dict:
    return {
        "type": event_type,
        "alert_id": log.id,
        "elder_id": elder.id,
        "elder_name": ", ".join(getattr(log, "elder_names", []) or [elder.full_name]),
        "location_address": elder.home_address,
        "assigned_worker_name": log.assigned_worker_name,
        "assigned_worker_phone": log.assigned_worker_phone,
        "message": message,
        "status": log.status.value,
        "stage": log.current_stage.value,
        "start_time": log.start_time.isoformat(),
        "candidate_workers_notified": len(log.worker_candidates),
        "service_fee_amount": float(log.service_fee_amount),
        "service_fee_paid": log.service_fee_paid,
    }


def _queue_resolved_customer_notifications(log: EmergencyLog) -> None:
    customer = log.elder.customer if log.elder and log.elder.customer else None
    if customer is None:
        return
    location_address = log.location_address or "your location"
    worker_name = log.assigned_worker_name or "Assigned worker"
    charge_amount = float(log.service_fee_amount)
    queue_email(
        recipients=[customer.email],
        subject="ELDERLY SOS resolved summary",
        text_body=(
            f"Hi {customer.full_name},\n\n"
            f"Your SOS for {location_address} has been marked resolved.\n"
            f"Worker on duty: {worker_name}\n"
            f"Charge due: Rs. {charge_amount:.0f}\n\n"
            "If you don't clear this amount by next 7 days your next visits will be paused till you clear the pending SOS amount.\n\n"
            "You can review and pay this charge from the customer portal.\n\n"
            "Thank you,\nELDERLY"
        ),
    )
    queue_sms(
        recipients=[customer.phone_number],
        body=(
            f"ELDERLY: SOS resolved for {location_address}. "
            f"Charge due Rs. {charge_amount:.0f}. Please clear within 7 days."
        ),
    )


async def _load_emergency_with_updates(session: AsyncSession, alert_id: int) -> EmergencyLog:
    result = await session.execute(
        select(EmergencyLog)
        .options(*EMERGENCY_RELATIONSHIP_OPTIONS)
        .where(EmergencyLog.id == alert_id)
    )
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency not found")
    await _annotate_emergency_logs(session, [log])
    return log


async def _annotate_emergency_logs(session: AsyncSession, logs: list[EmergencyLog]) -> list[EmergencyLog]:
    if not logs:
        return logs

    by_location: dict[tuple[int, str], list[EmergencyLog]] = {}
    for log in logs:
        if not log.elder:
            setattr(log, "elder_names", [])
            setattr(log, "location_emergency_count", 0)
            continue
        location_key = (log.elder.customer_id, _normalize_address(log.elder.home_address))
        by_location.setdefault(location_key, []).append(log)

    for (customer_id, normalized_address), items in by_location.items():
        sample = items[0]
        elder_result = await session.execute(
            select(Elder).where(
                Elder.customer_id == customer_id,
                Elder.home_address == sample.elder.home_address,
            )
        )
        elders = elder_result.scalars().all()
        count_result = await session.execute(
            select(EmergencyLog.status)
            .join(Elder, EmergencyLog.elder_id == Elder.id)
            .where(
                Elder.customer_id == customer_id,
                Elder.home_address == sample.elder.home_address,
            )
        )
        resolved_count = sum(1 for (status_value,) in count_result.all() if status_value == EmergencyStatus.RESPONDED)
        elder_names = sorted(elder.full_name for elder in elders)
        for log in items:
            setattr(log, "elder_names", elder_names)
            setattr(log, "location_emergency_count", resolved_count)
            setattr(log, "candidate_workers_notified", len(log.worker_candidates))
    return logs


async def trigger_emergency(
    session: AsyncSession,
    *,
    user: User,
    payload: EmergencyTriggerRequest,
) -> EmergencyLog:
    location_elders = await _resolve_location_elders(session, user=user, payload=payload)
    anchor = location_elders[0]
    elder_names = ", ".join(item.full_name for item in location_elders)

    trigger_latitude = payload.latitude if payload.latitude is not None else anchor.home_latitude
    trigger_longitude = payload.longitude if payload.longitude is not None else anchor.home_longitude

    log = EmergencyLog(
        elder_id=anchor.id,
        triggered_by_id=user.id,
        message=payload.message,
        trigger_latitude=trigger_latitude,
        trigger_longitude=trigger_longitude,
        audio_note_url=payload.audio_note_url,
        current_stage=EmergencyStage.ADMIN_NOTIFIED,
        status=EmergencyStatus.PENDING,
    )
    session.add(log)
    await session.flush()

    await _append_stage_update(
        session,
        log=log,
        stage=EmergencyStage.ADMIN_NOTIFIED,
        note=_default_stage_note(EmergencyStage.ADMIN_NOTIFIED),
        updated_by_id=user.id,
    )

    workers = await _find_nearest_available_workers(
        session,
        latitude=trigger_latitude,
        longitude=trigger_longitude,
    )
    if workers:
        for worker, distance_km in workers:
            session.add(
                EmergencyWorkerCandidate(
                    emergency_log_id=log.id,
                    worker_id=worker.id,
                    distance_km=distance_km,
                    status="NOTIFIED",
                    siren_active=True,
                )
            )
        await _append_stage_update(
            session,
            log=log,
            stage=EmergencyStage.WORKER_ASSIGNED,
            note=f"SOS broadcast to {len(workers)} nearest workers for first acceptance.",
            updated_by_id=None,
        )
    else:
        await _append_stage_update(
            session,
            log=log,
            stage=EmergencyStage.NO_WORKER_AVAILABLE,
            note=_default_stage_note(EmergencyStage.NO_WORKER_AVAILABLE),
            updated_by_id=None,
        )

    await session.commit()
    log = await _load_emergency_with_updates(session, log.id)
    customer_result = await session.execute(select(User).where(User.id == anchor.customer_id))
    location_customer = customer_result.scalar_one_or_none()

    admin_payload = _build_emergency_payload(log, anchor, payload.message, event_type="emergency")
    await connection_manager.broadcast_admin(admin_payload)
    await connection_manager.notify_customer(
        anchor.customer_id,
        admin_payload,
    )

    celery_app.send_task(
        "app.tasks.emergency.dispatch_high_priority_alert",
        kwargs={"alert_id": log.id, "user_id": anchor.customer_id, "message": payload.message},
    )
    queue_email(
        recipients=get_admin_alert_emails(),
        subject="ELDERLY SOS triggered",
        text_body=(
            f"An SOS has been triggered for {anchor.home_address}.\n"
            f"Elders at location: {elder_names}\n"
            f"Triggered by: {user.full_name}\n"
            f"Message: {payload.message}\n"
            f"Workers notified: {len(log.worker_candidates)}"
        ),
    )
    if location_customer is not None:
        queue_email(
            recipients=[location_customer.email],
            subject="ELDERLY SOS received",
            text_body=(
                f"Hi {location_customer.full_name},\n\n"
                f"We have received your SOS for {anchor.home_address}.\n"
                f"Elders at location: {elder_names}\n"
                f"Workers notified: {len(log.worker_candidates)}\n\n"
                "You can track the live status in the customer portal.\n\n"
                "Thank you,\nELDERLY"
            ),
        )
        queue_sms(
            recipients=[location_customer.phone_number],
            body=(
                f"ELDERLY SOS received for {anchor.home_address}. "
                f"{len(log.worker_candidates)} worker(s) notified."
            ),
        )
    for candidate in log.worker_candidates:
        await connection_manager.notify_worker(
            candidate.worker_id,
            {
                **admin_payload,
                "siren": True,
                "candidate_status": candidate.status,
            },
        )
        celery_app.send_task(
            "app.tasks.emergency.dispatch_high_priority_alert",
            kwargs={"alert_id": log.id, "user_id": candidate.worker_id, "message": payload.message},
        )
        if candidate.worker is not None:
            queue_email(
                recipients=[candidate.worker.email],
                subject="ELDERLY SOS duty alert",
                text_body=(
                    f"Hi {candidate.worker.full_name},\n\n"
                    f"A new SOS has been triggered near you for {anchor.home_address}.\n"
                    f"Elders at location: {elder_names}\n"
                    f"Distance: {candidate.distance_km:.2f} km\n\n"
                    "Please open the worker portal immediately to accept the duty if you are available.\n\n"
                    "Thank you,\nELDERLY"
                ),
            )
            queue_sms(
                recipients=[candidate.worker.phone_number],
                body=(
                    f"ELDERLY SOS alert near {anchor.home_address}. "
                    "Open the worker portal now if you can accept."
                ),
            )
    return log


async def update_emergency_stage(
    session: AsyncSession,
    *,
    user: User,
    alert_id: int,
    payload: EmergencyStageUpdateRequest,
) -> EmergencyLog:
    result = await session.execute(select(EmergencyLog).where(EmergencyLog.id == alert_id))
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency not found")
    if user.role not in (Role.WORKER, Role.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    await session.refresh(log, attribute_names=["worker_candidates"])
    if user.role == Role.WORKER:
        candidate = next((item for item in log.worker_candidates if item.worker_id == user.id), None)
        if payload.stage == EmergencyStage.WORKER_ACCEPTED:
            if candidate is None or candidate.status not in {"NOTIFIED", "ACCEPTED"}:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This SOS is not available for acceptance")
            if log.assigned_worker_id and log.assigned_worker_id != user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another worker already accepted this SOS")
            log.assigned_worker_id = user.id
            await _release_other_worker_candidates(session, log=log, accepted_worker_id=user.id)
        elif log.assigned_worker_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the accepted worker can update this SOS")
        allowed = WORKER_STAGE_TRANSITIONS.get(log.current_stage, set())
        if payload.stage not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stage transition from {log.current_stage.value} to {payload.stage.value} is not allowed.",
            )

    await _append_stage_update(
        session,
        log=log,
        stage=payload.stage,
        note=payload.note or _default_stage_note(payload.stage, actor_name=user.full_name),
        updated_by_id=user.id,
    )
    await session.commit()
    log = await _load_emergency_with_updates(session, log.id)

    broadcast_payload = {
        "type": "emergency_stage_update",
        "alert_id": log.id,
        "stage": log.current_stage.value,
        "status": log.status.value,
        "updated_by_id": user.id,
        "note": payload.note or _default_stage_note(payload.stage, actor_name=user.full_name),
    }
    await connection_manager.broadcast_admin(broadcast_payload)

    elder_result = await session.execute(select(Elder).where(Elder.id == log.elder_id))
    elder = elder_result.scalar_one_or_none()
    if elder is not None:
        await connection_manager.notify_customer(elder.customer_id, broadcast_payload)
    if payload.stage == EmergencyStage.WORKER_ACCEPTED:
        for candidate in log.worker_candidates:
            await connection_manager.notify_worker(
                candidate.worker_id,
                {
                    **broadcast_payload,
                    "type": "emergency_claimed" if candidate.worker_id != user.id else "emergency_stage_update",
                    "accepted_worker_id": user.id,
                    "siren": False,
                },
            )
        if elder is not None and elder.customer is not None and log.assigned_worker is not None:
            queue_email(
                recipients=[elder.customer.email],
                subject="ELDERLY SOS accepted by worker",
                text_body=(
                    f"Hi {elder.customer.full_name},\n\n"
                    f"Your SOS for {elder.home_address} has been accepted by {log.assigned_worker.full_name}.\n"
                    f"Worker phone: {log.assigned_worker.phone_number or 'Will be available in app'}\n\n"
                    "You can track the live emergency status in the customer portal.\n\n"
                    "Thank you,\nELDERLY"
                ),
            )
            queue_sms(
                recipients=[elder.customer.phone_number],
                body=(
                    f"ELDERLY: {log.assigned_worker.full_name} accepted your SOS for {elder.home_address}."
                ),
            )
    elif log.assigned_worker_id is not None:
        await connection_manager.notify_worker(log.assigned_worker_id, {**broadcast_payload, "siren": False})
    if payload.stage == EmergencyStage.RESOLVED:
        _queue_resolved_customer_notifications(log)
    return log


async def resolve_emergency(
    session: AsyncSession,
    *,
    admin: User,
    alert_id: int,
    payload: EmergencyResolveRequest,
) -> EmergencyLog:
    result = await session.execute(select(EmergencyLog).where(EmergencyLog.id == alert_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency not found")

    log.responder_id = admin.id
    log.action_taken = payload.action_taken
    await _append_stage_update(
        session,
        log=log,
        stage=EmergencyStage.RESOLVED,
        note=payload.action_taken or _default_stage_note(EmergencyStage.RESOLVED, actor_name=admin.full_name),
        updated_by_id=admin.id,
    )
    await session.commit()
    log = await _load_emergency_with_updates(session, log.id)
    _queue_resolved_customer_notifications(log)
    return log


async def list_emergencies_for_user(session: AsyncSession, user: User) -> list[EmergencyLog]:
    stmt = (
        select(EmergencyLog)
        .options(*EMERGENCY_RELATIONSHIP_OPTIONS)
        .order_by(desc(EmergencyLog.start_time))
    )
    if user.role == Role.CUSTOMER:
        stmt = stmt.join(Elder).where(Elder.customer_id == user.id)
    elif user.role == Role.WORKER:
        stmt = stmt.outerjoin(EmergencyWorkerCandidate).where(
            (EmergencyLog.assigned_worker_id == user.id)
            | (
                (EmergencyWorkerCandidate.worker_id == user.id)
                & (EmergencyWorkerCandidate.status.in_(["NOTIFIED", "ACCEPTED"]))
            )
        )
    result = await session.execute(stmt.limit(50))
    return await _annotate_emergency_logs(session, list(result.scalars().unique().all()))


async def pay_resolved_emergencies_for_location(
    session: AsyncSession,
    *,
    customer: User,
    payload: EmergencyPaymentRequest,
) -> EmergencyPaymentResponse:
    normalized_address = _normalize_address(payload.location_address)
    result = await session.execute(
        select(EmergencyLog)
        .join(Elder, EmergencyLog.elder_id == Elder.id)
        .where(
            Elder.customer_id == customer.id,
            EmergencyLog.status == EmergencyStatus.RESPONDED,
            EmergencyLog.service_fee_paid.is_(False),
        )
        .options(*EMERGENCY_RELATIONSHIP_OPTIONS)
    )
    matching_logs = [
        log
        for log in result.scalars().unique().all()
        if log.elder and _normalize_address(log.elder.home_address) == normalized_address
    ]
    if not matching_logs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No unpaid resolved SOS found for this location")

    paid_at = datetime.now(UTC)
    total = 0.0
    for log in matching_logs:
        log.service_fee_paid = True
        log.service_fee_paid_at = paid_at
        total += float(log.service_fee_amount)
    await session.commit()
    queue_email(
        recipients=[customer.email],
        subject="ELDERLY SOS payment received",
        text_body=(
            f"Hi {customer.full_name},\n\n"
            f"We received your SOS payment for {payload.location_address}.\n"
            f"Resolved SOS covered: {len(matching_logs)}\n"
            f"Total paid: Rs. {total:.0f}\n\n"
            "Thank you for clearing the pending SOS charges.\n\n"
            "Thank you,\nELDERLY"
        ),
    )
    queue_sms(
        recipients=[customer.phone_number],
        body=(
            f"ELDERLY: SOS payment received for {payload.location_address}. "
            f"Paid Rs. {total:.0f}."
        ),
    )
    return EmergencyPaymentResponse(
        location_address=payload.location_address,
        paid_alert_count=len(matching_logs),
        total_paid_amount=total,
    )
