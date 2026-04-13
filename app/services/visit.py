import asyncio
import base64
import math
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from geopy.distance import geodesic
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.audit import AuditActionType
from app.models.elder import Elder
from app.models.subscription import Subscription
from app.models.emergency import EmergencyLog, EmergencyStatus
from app.models.user import Role, User
from app.models.visit import Visit, VisitImage, VisitStatus, VisitTask
from app.schemas.visit import (
    AdminVisitRequestItem,
    CustomerVisitUsageResponse,
    VisitCheckInRequest,
    VisitCheckOutRequest,
    VisitBookingDetailsResponse,
    VisitRequestCreate,
    VisitResponse,
    VisitScheduleRequest,
    VisitSlotOption,
    VisitSummaryItem,
    VisitSummaryResponse,
    WorkerUpcomingVisitItem,
    WorkerDailySummaryResponse,
    WorkerAssignedElder,
    WorkerDispatchStatusUpdate,
)
from app.services.audit import log_audit_event
from app.services.notification import connection_manager, send_high_priority_alert


VISIT_RELATIONSHIP_OPTIONS = (
    selectinload(Visit.tasks),
    selectinload(Visit.worker),
    selectinload(Visit.elder).selectinload(Elder.customer),
    selectinload(Visit.images),
    selectinload(Visit.requested_by),
)
UPLOAD_DIR = Path("uploads") / "visit-evidence"
DISPATCH_RADIUS_KM = 5.0
MONTHLY_VISIT_LIMIT_PER_LOCATION = 8
VISIT_SLOT_HOURS = (10, 13, 16, 19)
VISIT_SLOT_DURATION_HOURS = 2
LOCAL_TZ = ZoneInfo("Asia/Calcutta")


def _decode_data_url(data_url: str) -> tuple[str, bytes]:
    if "," not in data_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image payload")
    header, encoded = data_url.split(",", 1)
    if ";base64" not in header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image must be base64 encoded")
    mime = header.split(":")[-1].split(";")[0]
    extension = mime.split("/")[-1] if "/" in mime else "jpg"
    try:
        return extension, base64.b64decode(encoded)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to decode captured image",
        ) from exc


def _save_photo(data_url: str) -> tuple[str, str]:
    extension, content = _decode_data_url(data_url)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    storage_key = f"{uuid4().hex}.{extension}"
    destination = UPLOAD_DIR / storage_key
    destination.write_bytes(content)
    return f"/uploads/visit-evidence/{storage_key}", storage_key


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


def _visit_response_url(relative_url: str | None) -> str | None:
    if not relative_url:
        return None
    return f"http://127.0.0.1:8000{relative_url}"


def _normalize_address(address: str) -> str:
    return " ".join(address.strip().lower().split())


def _slot_label(start_time: datetime) -> str:
    return start_time.astimezone(LOCAL_TZ).strftime("%a, %d %b | %I:%M %p")


def _status_label(visit: Visit) -> str:
    if visit.status == VisitStatus.PENDING and visit.scheduled_start_time:
        return "Scheduled"
    if visit.status == VisitStatus.ACTIVE:
        return "In Progress"
    if visit.status == VisitStatus.COMPLETED:
        return "Completed"
    if visit.status == VisitStatus.REJECTED:
        return "Rejected"
    return visit.status.value.title()


def _visit_overlaps(
    existing_start: datetime | None,
    existing_end: datetime | None,
    proposed_start: datetime,
    proposed_end: datetime,
) -> bool:
    if existing_start is None:
        return False
    effective_end = existing_end or (existing_start + timedelta(hours=VISIT_SLOT_DURATION_HOURS))
    return existing_start < proposed_end and proposed_start < effective_end


async def _get_location_elders_for_customer(
    session: AsyncSession,
    *,
    customer_id: int,
    elder_id: int | None = None,
    location_address: str | None = None,
) -> list[Elder]:
    result = await session.execute(select(Elder).where(Elder.customer_id == customer_id))
    elders = result.scalars().all()
    if elder_id is not None:
        anchor = next((item for item in elders if item.id == elder_id), None)
        if anchor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")
        location_key = _normalize_address(anchor.home_address)
    elif location_address:
        location_key = _normalize_address(location_address)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Location is required")

    location_elders = [item for item in elders if _normalize_address(item.home_address) == location_key]
    if not location_elders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location_elders


async def _get_location_elders_for_worker(
    session: AsyncSession,
    *,
    worker_id: int,
    elder_id: int | None = None,
    location_address: str | None = None,
) -> list[Elder]:
    result = await session.execute(select(Elder).where(Elder.assigned_worker_id == worker_id))
    elders = result.scalars().all()
    if elder_id is not None:
        anchor = next((item for item in elders if item.id == elder_id), None)
        if anchor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
        location_key = _normalize_address(anchor.home_address)
    elif location_address:
        location_key = _normalize_address(location_address)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Location is required")

    location_elders = [item for item in elders if _normalize_address(item.home_address) == location_key]
    if not location_elders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location_elders


async def _create_visit_image(
    session: AsyncSession,
    *,
    visit: Visit,
    worker: User,
    image_type: str,
    data_url: str,
    latitude: float,
    longitude: float,
) -> VisitImage:
    relative_url, storage_key = await asyncio.to_thread(_save_photo, data_url)
    image = VisitImage(
        visit_id=visit.id,
        uploaded_by_id=worker.id,
        image_type=image_type,
        file_url=relative_url,
        storage_backend="local",
        storage_key=storage_key,
        latitude=latitude,
        longitude=longitude,
        captured_at=datetime.now(UTC),
    )
    session.add(image)
    if image_type == "start":
        visit.photo_start_url = _visit_response_url(relative_url)
    elif image_type == "end":
        visit.photo_end_url = _visit_response_url(relative_url)
    return image


async def _get_existing_active_visit(session: AsyncSession, worker_id: int) -> Visit | None:
    active_visit_result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .where(
            Visit.worker_id == worker_id,
            Visit.status == VisitStatus.ACTIVE,
        )
        .order_by(desc(Visit.check_in_time))
    )
    return active_visit_result.scalars().first()


async def update_worker_dispatch_status(
    session: AsyncSession,
    *,
    worker: User,
    payload: WorkerDispatchStatusUpdate,
) -> User:
    worker.current_latitude = payload.latitude
    worker.current_longitude = payload.longitude
    worker.available_for_dispatch = payload.available_for_dispatch
    worker.location_updated_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(worker)
    return worker


async def request_visit_dispatch(
    session: AsyncSession,
    *,
    customer: User,
    payload: VisitRequestCreate,
) -> Visit:
    location_elders = await _get_location_elders_for_customer(
        session,
        customer_id=customer.id,
        elder_id=payload.elder_id,
        location_address=payload.location_address,
    )
    elder = location_elders[0]
    location_elder_ids = [item.id for item in location_elders]

    existing_pending_result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .where(
            Visit.elder_id.in_(location_elder_ids),
            Visit.status == VisitStatus.PENDING,
        )
        .order_by(desc(Visit.created_at))
    )
    existing_pending = existing_pending_result.scalars().first()
    if existing_pending:
        return existing_pending

    workers_result = await session.execute(
        select(User)
        .where(
            User.role == Role.WORKER,
            User.is_active.is_(True),
            User.is_verified.is_(True),
            User.available_for_dispatch.is_(True),
            User.current_latitude.is_not(None),
            User.current_longitude.is_not(None),
        )
        .order_by(User.location_updated_at.desc())
    )
    workers = workers_result.scalars().all()

    if not workers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active worker is currently available for dispatch.",
        )

    active_visit_result = await session.execute(
        select(Visit.worker_id).where(Visit.status == VisitStatus.ACTIVE)
    )
    busy_worker_ids = {item[0] for item in active_visit_result.all()}

    nearest_worker: User | None = None
    nearest_distance_km: float | None = None
    for worker in workers:
        if worker.id in busy_worker_ids:
            continue
        distance_km = _haversine_km(
            elder.home_latitude,
            elder.home_longitude,
            worker.current_latitude,
            worker.current_longitude,
        )
        if distance_km > DISPATCH_RADIUS_KM:
            continue
        if nearest_distance_km is None or distance_km < nearest_distance_km:
            nearest_worker = worker
            nearest_distance_km = distance_km

    if nearest_worker is None or nearest_distance_km is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No available worker found within 5 km of the elder's location.",
        )

    elder.assigned_worker_id = nearest_worker.id
    visit = Visit(
        worker_id=nearest_worker.id,
        elder_id=elder.id,
        notes=payload.notes,
        distance_meters=nearest_distance_km * 1000,
        status=VisitStatus.PENDING,
    )
    session.add(visit)

    await log_audit_event(
        session,
        user_id=customer.id,
        action_type=AuditActionType.CHECK_IN_ATTEMPT,
        action="visit_auto_dispatched",
        detail=(
            f"elder_id={elder.id}, worker_id={nearest_worker.id}, "
            f"distance_km={nearest_distance_km:.2f}"
        ),
    )

    await session.commit()
    result = await session.execute(
        select(Visit).options(*VISIT_RELATIONSHIP_OPTIONS).where(Visit.id == visit.id)
    )
    visit = result.scalar_one()

    message = (
        f"New ELDERLY visit request for {elder.home_address}. "
        f"You were auto-assigned as the nearest available worker."
    )
    await connection_manager.notify_worker(
        nearest_worker.id,
        {
            "type": "visit_dispatch",
            "visit_id": visit.id,
            "elder_id": elder.id,
            "elder_name": ", ".join(item.full_name for item in location_elders),
            "location_address": elder.home_address,
            "message": message,
            "distance_km": round(nearest_distance_km, 2),
        },
    )
    await send_high_priority_alert(nearest_worker.id, message)
    return visit


async def _get_dispatch_ready_workers(session: AsyncSession) -> list[User]:
    workers_result = await session.execute(
        select(User)
        .where(
            User.role == Role.WORKER,
            User.is_active.is_(True),
            User.is_verified.is_(True),
            User.available_for_dispatch.is_(True),
            User.current_latitude.is_not(None),
            User.current_longitude.is_not(None),
        )
        .order_by(User.location_updated_at.desc())
    )
    return workers_result.scalars().all()


async def _get_busy_workers_for_window(
    session: AsyncSession,
    *,
    window_start: datetime,
    window_end: datetime,
) -> set[int]:
    result = await session.execute(
        select(Visit)
        .where(Visit.status.in_([VisitStatus.PENDING, VisitStatus.ACTIVE]))
    )
    busy: set[int] = set()
    for visit in result.scalars().all():
        start_time = visit.scheduled_start_time or visit.check_in_time
        end_time = visit.scheduled_end_time or visit.check_out_time
        if _visit_overlaps(start_time, end_time, window_start, window_end):
            busy.add(visit.worker_id)
    return busy


async def _find_available_workers_for_slot(
    session: AsyncSession,
    *,
    latitude: float,
    longitude: float,
    slot_start: datetime,
    slot_end: datetime,
) -> list[tuple[User, float]]:
    workers = await _get_dispatch_ready_workers(session)
    if not workers:
        return []
    busy_workers = await _get_busy_workers_for_window(session, window_start=slot_start, window_end=slot_end)
    ranked_workers: list[tuple[User, float]] = []
    for worker in workers:
        if worker.id in busy_workers:
            continue
        distance_km = _haversine_km(latitude, longitude, worker.current_latitude, worker.current_longitude)
        if distance_km > DISPATCH_RADIUS_KM:
            continue
        ranked_workers.append((worker, distance_km))
    ranked_workers.sort(key=lambda item: item[1])
    return ranked_workers


async def list_available_visit_slots(
    session: AsyncSession,
    *,
    customer: User,
    elder_id: int | None = None,
    location_address: str | None = None,
) -> list[VisitSlotOption]:
    location_elders = await _get_location_elders_for_customer(
        session,
        customer_id=customer.id,
        elder_id=elder_id,
        location_address=location_address,
    )
    anchor = location_elders[0]
    now_local = datetime.now(LOCAL_TZ)
    slots: list[VisitSlotOption] = []
    for day_offset in range(7):
        day = (now_local + timedelta(days=day_offset)).date()
        for hour in VISIT_SLOT_HOURS:
            slot_start_local = datetime(day.year, day.month, day.day, hour, 0, tzinfo=LOCAL_TZ)
            if slot_start_local <= now_local + timedelta(minutes=30):
                continue
            slot_start = slot_start_local.astimezone(UTC)
            slot_end = slot_start + timedelta(hours=VISIT_SLOT_DURATION_HOURS)
            workers = await _find_available_workers_for_slot(
                session,
                latitude=anchor.home_latitude,
                longitude=anchor.home_longitude,
                slot_start=slot_start,
                slot_end=slot_end,
            )
            if not workers:
                continue
            slots.append(
                VisitSlotOption(
                    start_time=slot_start,
                    end_time=slot_end,
                    label=_slot_label(slot_start),
                    available_workers=len(workers),
                )
            )
    return slots


async def schedule_visit_request(
    session: AsyncSession,
    *,
    customer: User,
    payload: VisitScheduleRequest,
) -> Visit:
    location_elders = await _get_location_elders_for_customer(
        session,
        customer_id=customer.id,
        elder_id=payload.elder_id,
        location_address=payload.location_address,
    )
    anchor = location_elders[0]
    slot_start = payload.scheduled_start_time.astimezone(UTC)
    slot_end = slot_start + timedelta(hours=VISIT_SLOT_DURATION_HOURS)

    workers = await _find_available_workers_for_slot(
        session,
        latitude=anchor.home_latitude,
        longitude=anchor.home_longitude,
        slot_start=slot_start,
        slot_end=slot_end,
    )
    if not workers:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No worker is available for that date and time.")

    assigned_worker, distance_km = workers[0]
    anchor.assigned_worker_id = assigned_worker.id

    visit = Visit(
        worker_id=assigned_worker.id,
        elder_id=anchor.id,
        requested_by_id=customer.id,
        scheduled_start_time=slot_start,
        scheduled_end_time=slot_end,
        location_address_snapshot=anchor.home_address,
        notes=payload.notes,
        distance_meters=distance_km * 1000,
        status=VisitStatus.PENDING,
    )
    session.add(visit)
    await session.commit()
    result = await session.execute(select(Visit).options(*VISIT_RELATIONSHIP_OPTIONS).where(Visit.id == visit.id))
    visit = result.scalar_one()

    await connection_manager.notify_worker(
        assigned_worker.id,
        {
            "type": "visit_dispatch",
            "visit_id": visit.id,
            "elder_id": anchor.id,
            "elder_name": ", ".join(item.full_name for item in location_elders),
            "location_address": anchor.home_address,
            "message": f"Upcoming visit scheduled for {_slot_label(slot_start)}.",
            "scheduled_start_time": slot_start.isoformat(),
        },
    )
    await send_high_priority_alert(assigned_worker.id, f"New upcoming visit on {_slot_label(slot_start)}")
    return visit


async def get_visit_booking_details(
    session: AsyncSession,
    *,
    visit_id: int,
    customer: User | None = None,
    worker: User | None = None,
) -> VisitBookingDetailsResponse:
    result = await session.execute(
        select(Visit).options(*VISIT_RELATIONSHIP_OPTIONS).where(Visit.id == visit_id)
    )
    visit = result.scalar_one_or_none()
    if visit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    if customer and visit.requested_by_id != customer.id and visit.elder.customer_id != customer.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if worker and visit.worker_id != worker.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    elder_result = await session.execute(
        select(Elder).where(
            Elder.customer_id == visit.elder.customer_id,
            Elder.home_address == visit.elder.home_address,
        )
    )
    location_elders = elder_result.scalars().all()
    return VisitBookingDetailsResponse(
        visit=VisitResponse.model_validate(visit),
        elder_names=[elder.full_name for elder in location_elders],
        worker_phone=visit.worker.phone_number if visit.worker else None,
        customer_name=visit.requested_by_name or (visit.elder.customer.full_name if visit.elder and visit.elder.customer else None),
        status_label=_status_label(visit),
    )


async def list_customer_scheduled_visits(session: AsyncSession, *, customer: User) -> list[VisitBookingDetailsResponse]:
    result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .join(Elder)
        .where(Elder.customer_id == customer.id)
        .order_by(Visit.scheduled_start_time.asc().nullslast(), desc(Visit.created_at))
    )
    visits = result.scalars().all()
    items: list[VisitBookingDetailsResponse] = []
    for visit in visits:
        items.append(await get_visit_booking_details(session, visit_id=visit.id, customer=customer))
    return items


async def list_worker_upcoming_visits(session: AsyncSession, *, worker: User) -> list[WorkerUpcomingVisitItem]:
    now = datetime.now(UTC) - timedelta(hours=1)
    result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .where(
            Visit.worker_id == worker.id,
            Visit.status.in_([VisitStatus.PENDING, VisitStatus.ACTIVE]),
            Visit.scheduled_start_time.is_not(None),
            Visit.scheduled_start_time >= now,
        )
        .order_by(Visit.scheduled_start_time.asc())
    )
    visits = result.scalars().all()
    items: list[WorkerUpcomingVisitItem] = []
    for visit in visits:
        elder_result = await session.execute(
            select(Elder).where(
                Elder.customer_id == visit.elder.customer_id,
                Elder.home_address == visit.elder.home_address,
            )
        )
        location_elders = elder_result.scalars().all()
        items.append(
            WorkerUpcomingVisitItem(
                visit=VisitResponse.model_validate(visit),
                elder_names=[elder.full_name for elder in location_elders],
                customer_name=visit.elder.customer.full_name if visit.elder and visit.elder.customer else None,
                customer_phone=visit.elder.customer.phone_number if visit.elder and visit.elder.customer else None,
            )
        )
    return items


async def list_admin_visit_requests(session: AsyncSession) -> list[AdminVisitRequestItem]:
    result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .order_by(Visit.scheduled_start_time.asc().nullslast(), desc(Visit.created_at))
    )
    visits = result.scalars().all()
    items: list[AdminVisitRequestItem] = []
    for visit in visits:
        elder_result = await session.execute(
            select(Elder).where(
                Elder.customer_id == visit.elder.customer_id,
                Elder.home_address == visit.elder.home_address,
            )
        )
        location_elders = elder_result.scalars().all()
        customer = visit.elder.customer if visit.elder else None
        items.append(
            AdminVisitRequestItem(
                visit=VisitResponse.model_validate(visit),
                customer_name=customer.full_name if customer else None,
                customer_phone=customer.phone_number if customer else None,
                elder_names=[elder.full_name for elder in location_elders],
                worker_phone=visit.worker.phone_number if visit.worker else None,
            )
        )
    return items


async def check_in_visit(
    session: AsyncSession,
    *,
    worker: User,
    elder: Elder,
    payload: VisitCheckInRequest,
) -> Visit:
    if worker.role != Role.WORKER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Worker role required")
    if elder.assigned_worker_id != worker.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Worker is not assigned to this elder",
        )

    existing_active_visit = await _get_existing_active_visit(session, worker.id)
    if existing_active_visit:
        if existing_active_visit.elder_id == elder.id:
            return existing_active_visit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "You already have an active visit in progress. "
                "Please complete it before starting a new one."
            ),
        )

    distance_meters = await asyncio.to_thread(
        lambda: geodesic(
            (payload.latitude, payload.longitude),
            (elder.home_latitude, elder.home_longitude),
        ).meters
    )
    is_allowed = distance_meters < settings.GEOFENCE_RADIUS_METERS

    pending_result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .where(
            Visit.worker_id == worker.id,
            Visit.elder_id == elder.id,
            Visit.status == VisitStatus.PENDING,
        )
        .order_by(desc(Visit.created_at))
    )
    visit = pending_result.scalars().first()
    if visit is None:
        visit = Visit(
            worker_id=worker.id,
            elder_id=elder.id,
            status=VisitStatus.PENDING,
        )
        session.add(visit)
        await session.flush()

    visit.check_in_time = datetime.now(UTC)
    visit.start_latitude = payload.latitude
    visit.start_longitude = payload.longitude
    visit.distance_meters = distance_meters
    visit.status = VisitStatus.ACTIVE if is_allowed else VisitStatus.REJECTED

    await _create_visit_image(
        session,
        visit=visit,
        worker=worker,
        image_type="start",
        data_url=payload.photo_data_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    await log_audit_event(
        session,
        user_id=worker.id,
        action_type=AuditActionType.CHECK_IN_ATTEMPT,
        action="visit_check_in_attempt",
        detail=(
            f"elder_id={elder.id}, distance_meters={distance_meters:.2f}, "
            f"allowed={str(is_allowed).lower()}"
        ),
    )

    await session.commit()
    result = await session.execute(
        select(Visit).options(*VISIT_RELATIONSHIP_OPTIONS).where(Visit.id == visit.id)
    )
    visit = result.scalar_one()

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-in rejected. Worker is {distance_meters:.2f}m away from elder home",
        )

    return visit


async def list_assigned_elders(session: AsyncSession, worker: User) -> list[WorkerAssignedElder]:
    result = await session.execute(
        select(Elder)
        .where(Elder.assigned_worker_id == worker.id)
        .order_by(Elder.full_name.asc())
    )
    elders = result.scalars().all()
    visits_result = await session.execute(
        select(Visit)
        .options(selectinload(Visit.elder))
        .where(
            Visit.worker_id == worker.id,
            Visit.status.in_([VisitStatus.ACTIVE, VisitStatus.PENDING]),
        )
        .order_by(desc(Visit.created_at))
    )
    visits = visits_result.scalars().all()

    elder_by_id = {elder.id: elder for elder in elders}
    grouped_elders: dict[str, list[Elder]] = defaultdict(list)
    for elder in elders:
        grouped_elders[_normalize_address(elder.home_address)].append(elder)

    grouped_visits: dict[str, list[Visit]] = defaultdict(list)
    for visit in visits:
        if visit.elder_id in elder_by_id:
            grouped_visits[_normalize_address(elder_by_id[visit.elder_id].home_address)].append(visit)

    items: list[WorkerAssignedElder] = []
    for location_key, location_elders in grouped_elders.items():
        location_visits = grouped_visits.get(location_key, [])
        if not location_visits:
            continue
        representative = location_elders[0]
        active_visit = next((item for item in location_visits if item.status == VisitStatus.ACTIVE), None)
        pending_visit = next((item for item in location_visits if item.status == VisitStatus.PENDING), None)
        items.append(
            WorkerAssignedElder(
                elder_id=representative.id,
                elder_name=representative.full_name,
                elder_names=[item.full_name for item in location_elders],
                elder_count=len(location_elders),
                pod_name=representative.pod_name,
                home_address=representative.home_address,
                home_latitude=representative.home_latitude,
                home_longitude=representative.home_longitude,
                active_visit_id=active_visit.id if active_visit else None,
                active_visit_started_at=active_visit.check_in_time if active_visit else None,
                active_visit_status=active_visit.status if active_visit else None,
                pending_visit_id=pending_visit.id if pending_visit else None,
            )
        )
    items.sort(key=lambda item: item.home_address.lower())
    return items


async def get_active_visit_for_worker(session: AsyncSession, worker: User) -> Visit | None:
    result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .where(
            Visit.worker_id == worker.id,
            Visit.status == VisitStatus.ACTIVE,
        )
        .order_by(desc(Visit.check_in_time))
    )
    return result.scalars().first()


async def list_active_visits(session: AsyncSession) -> list[Visit]:
    result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .where(Visit.status == VisitStatus.ACTIVE)
        .order_by(desc(Visit.check_in_time))
    )
    return list(result.scalars().all())


async def end_visit(
    session: AsyncSession,
    *,
    worker: User,
    visit_id: int,
    payload: VisitCheckOutRequest,
) -> Visit:
    result = await session.execute(
        select(Visit)
        .options(*VISIT_RELATIONSHIP_OPTIONS)
        .where(Visit.id == visit_id, Visit.worker_id == worker.id)
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    if visit.status != VisitStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active visits can be completed",
        )

    visit.check_out_time = datetime.now(UTC)
    visit.end_latitude = payload.latitude
    visit.end_longitude = payload.longitude
    visit.notes = payload.notes
    visit.mood_photo_url = payload.mood_photo_url
    visit.voice_note_url = payload.voice_note_url
    visit.status = VisitStatus.COMPLETED
    visit.tasks.clear()
    for item in payload.tasks:
        visit.tasks.append(VisitTask(**item.model_dump()))

    await _create_visit_image(
        session,
        visit=visit,
        worker=worker,
        image_type="end",
        data_url=payload.photo_data_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    await log_audit_event(
        session,
        user_id=worker.id,
        action_type=AuditActionType.VISIT_COMPLETED,
        action="visit_completed",
        detail=f"visit_id={visit.id}, elder_id={visit.elder_id}",
    )

    await session.commit()
    result = await session.execute(
        select(Visit).options(*VISIT_RELATIONSHIP_OPTIONS).where(Visit.id == visit.id)
    )
    return result.scalar_one()


async def get_visit_summary_for_customer(
    session: AsyncSession,
    *,
    customer: User,
    elder_id: int,
) -> VisitSummaryResponse:
    elder_result = await session.execute(
        select(Elder).where(Elder.id == elder_id, Elder.customer_id == customer.id)
    )
    elder = elder_result.scalar_one_or_none()
    if not elder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")

    count_result = await session.execute(
        select(
            func.count(Visit.id),
            func.count(Visit.id).filter(Visit.status == VisitStatus.COMPLETED),
        ).where(Visit.elder_id == elder_id)
    )
    total_visits, completed_visits = count_result.one()

    visits_result = await session.execute(
        select(Visit)
        .options(selectinload(Visit.tasks))
        .where(Visit.elder_id == elder_id)
        .order_by(desc(Visit.check_in_time))
        .limit(5)
    )
    visits = visits_result.scalars().all()

    recent_visits = [
        VisitSummaryItem(
            visit_id=visit.id,
            check_in_time=visit.check_in_time,
            check_out_time=visit.check_out_time,
            status=visit.status,
            duration_minutes=(
                int((visit.check_out_time - visit.check_in_time).total_seconds() // 60)
                if visit.check_in_time and visit.check_out_time
                else None
            ),
            notes=visit.notes,
            mood_photo_url=visit.mood_photo_url,
            photo_start_url=visit.photo_start_url,
            photo_end_url=visit.photo_end_url,
            voice_note_url=visit.voice_note_url,
            tasks=visit.tasks,
        )
        for visit in visits
    ]

    return VisitSummaryResponse(
        elder_id=elder_id,
        total_visits=total_visits or 0,
        completed_visits=completed_visits or 0,
        recent_visits=recent_visits,
    )


async def get_customer_visit_usage(
    session: AsyncSession,
    *,
    customer: User,
) -> CustomerVisitUsageResponse:
    subscriptions_result = await session.execute(
        select(Subscription)
        .options(selectinload(Subscription.elder))
        .where(Subscription.customer_id == customer.id, Subscription.status == "ACTIVE")
    )
    active_subscriptions = subscriptions_result.scalars().all()
    subscribed_locations = {
        _normalize_address(item.elder.home_address)
        for item in active_subscriptions
        if item.elder is not None
    }

    now = datetime.now(UTC)
    month_start = datetime(now.year, now.month, 1, tzinfo=UTC)
    visits_result = await session.execute(
        select(Visit)
        .options(selectinload(Visit.elder))
        .join(Elder)
        .where(
            Elder.customer_id == customer.id,
            Visit.status == VisitStatus.COMPLETED,
            Visit.check_out_time.is_not(None),
            Visit.check_out_time >= month_start,
        )
    )
    completed_visits = visits_result.scalars().all()
    completed_visits_this_month = len(completed_visits)
    monthly_visit_limit = len(subscribed_locations) * MONTHLY_VISIT_LIMIT_PER_LOCATION
    remaining_visits_this_month = max(monthly_visit_limit - completed_visits_this_month, 0)

    return CustomerVisitUsageResponse(
        monthly_visit_limit=monthly_visit_limit,
        subscribed_locations=len(subscribed_locations),
        completed_visits_this_month=completed_visits_this_month,
        remaining_visits_this_month=remaining_visits_this_month,
    )


async def get_worker_daily_summary(
    session: AsyncSession,
    *,
    worker: User,
) -> WorkerDailySummaryResponse:
    now = datetime.now(UTC)
    day_start = datetime(now.year, now.month, now.day, tzinfo=UTC)

    visits_result = await session.execute(
        select(func.count(Visit.id)).where(
            Visit.worker_id == worker.id,
            Visit.status == VisitStatus.COMPLETED,
            Visit.check_out_time.is_not(None),
            Visit.check_out_time >= day_start,
        )
    )
    emergencies_result = await session.execute(
        select(func.count(EmergencyLog.id)).where(
            EmergencyLog.assigned_worker_id == worker.id,
            EmergencyLog.status == EmergencyStatus.RESPONDED,
            EmergencyLog.resolution_time.is_not(None),
            EmergencyLog.resolution_time >= day_start,
        )
    )

    return WorkerDailySummaryResponse(
        completed_visits_today=visits_result.scalar_one() or 0,
        completed_emergencies_today=emergencies_result.scalar_one() or 0,
    )
