from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import UTC, datetime, timedelta

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models.emergency import EmergencyLog, EmergencyStatus
from app.models.user import Role, User
from app.models.visit import Visit, VisitStatus
from app.schemas.user import UserResponse, WorkerAdminUpdate
from app.schemas.visit import AdminVisitRequestItem, VisitResponse
from app.services.subscription import get_subscription_metrics
from app.services.visit import list_active_visits, list_admin_visit_requests


router = APIRouter()


@router.get("/workers/pending", response_model=list[UserResponse])
async def pending_workers(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> list[UserResponse]:
    result = await db.execute(
        select(User)
        .where(User.role == Role.WORKER, User.is_verified.is_(False))
        .order_by(desc(User.created_at))
    )
    return [UserResponse.model_validate(item) for item in result.scalars().all()]


@router.get("/workers/active", response_model=list[UserResponse])
async def active_workers(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> list[UserResponse]:
    result = await db.execute(
        select(User)
        .where(User.role == Role.WORKER, User.is_verified.is_(True))
        .order_by(User.is_active.desc(), User.full_name.asc())
    )
    return [UserResponse.model_validate(item) for item in result.scalars().all()]


@router.patch("/workers/{user_id}", response_model=UserResponse)
async def update_worker(
    user_id: int,
    payload: WorkerAdminUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> UserResponse:
    result = await db.execute(select(User).where(User.id == user_id, User.role == Role.WORKER))
    worker = result.scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    for field, value in payload.model_dump().items():
        setattr(worker, field, value)
    await db.commit()
    await db.refresh(worker)
    return UserResponse.model_validate(worker)


@router.get("/users", response_model=list[UserResponse])
async def all_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> list[UserResponse]:
    result = await db.execute(select(User).order_by(desc(User.created_at)))
    return [UserResponse.model_validate(item) for item in result.scalars().all()]


@router.get("/visits/active", response_model=list[VisitResponse])
async def active_visits(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> list[VisitResponse]:
    visits = await list_active_visits(db)
    return [VisitResponse.model_validate(item) for item in visits]


@router.get("/visits/requests", response_model=list[AdminVisitRequestItem])
async def visit_requests(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> list[AdminVisitRequestItem]:
    return await list_admin_visit_requests(db)


@router.get("/dashboard/summary")
async def admin_dashboard_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> dict:
    metrics = await get_subscription_metrics(db)
    active_visits_count = len(await list_active_visits(db))
    verified_workers_result = await db.execute(
        select(User).where(User.role == Role.WORKER, User.is_verified.is_(True))
    )
    verified_workers = verified_workers_result.scalars().all()
    active_workers_now = sum(1 for worker in verified_workers if worker.is_active and worker.available_for_dispatch)
    inactive_workers_now = len(verified_workers) - active_workers_now

    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, tzinfo=UTC)
    week_start = today_start - timedelta(days=6)

    visit_rows = (
        await db.execute(
            select(
                func.date(Visit.created_at).label("visit_day"),
                Visit.status,
                func.count(Visit.id),
            )
            .where(Visit.created_at >= week_start)
            .group_by("visit_day", Visit.status)
            .order_by("visit_day")
        )
    ).all()

    visit_daily: dict[str, dict[str, int]] = {}
    for visit_day, visit_status, count in visit_rows:
        key = str(visit_day)
        visit_daily.setdefault(key, {"PENDING": 0, "ACTIVE": 0, "COMPLETED": 0, "REJECTED": 0})
        visit_daily[key][visit_status.value] = count

    today_visit_counts = visit_daily.get(str(today_start.date()), {"PENDING": 0, "ACTIVE": 0, "COMPLETED": 0, "REJECTED": 0})

    emergency_counts = (
        await db.execute(
            select(
                func.count(EmergencyLog.id).filter(EmergencyLog.status == EmergencyStatus.PENDING),
                func.count(EmergencyLog.id).filter(EmergencyLog.status == EmergencyStatus.RESPONDED),
            )
        )
    ).one()

    user_counts = (
        await db.execute(
            select(
                func.count(User.id).filter(User.role == Role.CUSTOMER),
                func.count(User.id).filter(User.role == Role.WORKER),
                func.count(User.id).filter(User.role == Role.ADMIN),
            )
        )
    ).one()

    return {
        "active_visits": active_visits_count,
        "active_subscriptions": metrics.active_subscriptions,
        "total_mrr": metrics.total_mrr,
        "workers_active_now": active_workers_now,
        "workers_inactive_now": inactive_workers_now,
        "today_visits_pending": today_visit_counts.get("PENDING", 0),
        "today_visits_ongoing": today_visit_counts.get("ACTIVE", 0),
        "today_visits_finished": today_visit_counts.get("COMPLETED", 0),
        "visit_daily": visit_daily,
        "open_emergencies": emergency_counts[0] or 0,
        "resolved_emergencies": emergency_counts[1] or 0,
        "customers": user_counts[0] or 0,
        "workers": user_counts[1] or 0,
        "admins": user_counts[2] or 0,
    }


@router.get("/workers/live")
async def live_worker_tracking(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(Role.ADMIN))],
) -> list[dict]:
    workers_result = await db.execute(
        select(User)
        .where(User.role == Role.WORKER, User.is_verified.is_(True))
        .order_by(User.full_name.asc())
    )
    workers = workers_result.scalars().all()

    active_visits_result = await db.execute(
        select(Visit)
        .options(selectinload(Visit.elder))
        .where(Visit.status.in_([VisitStatus.PENDING, VisitStatus.ACTIVE]))
        .order_by(desc(Visit.created_at))
    )
    open_visits = active_visits_result.scalars().all()
    latest_visit_by_worker: dict[int, Visit] = {}
    for visit in open_visits:
        if visit.worker_id not in latest_visit_by_worker:
            latest_visit_by_worker[visit.worker_id] = visit

    open_emergency_result = await db.execute(
        select(EmergencyLog)
        .options(selectinload(EmergencyLog.elder))
        .where(EmergencyLog.status == EmergencyStatus.PENDING)
        .order_by(desc(EmergencyLog.start_time))
    )
    open_emergencies = open_emergency_result.scalars().all()
    latest_emergency_by_worker: dict[int, EmergencyLog] = {}
    for emergency in open_emergencies:
        if emergency.assigned_worker_id and emergency.assigned_worker_id not in latest_emergency_by_worker:
            latest_emergency_by_worker[emergency.assigned_worker_id] = emergency

    items: list[dict] = []
    for worker in workers:
        visit = latest_visit_by_worker.get(worker.id)
        emergency = latest_emergency_by_worker.get(worker.id)
        items.append(
            {
                "id": worker.id,
                "full_name": worker.full_name,
                "phone_number": worker.phone_number,
                "email": worker.email,
                "base_location": worker.base_location,
                "is_active": worker.is_active,
                "available_for_dispatch": worker.available_for_dispatch,
                "is_active_today": worker.is_active_today,
                "current_latitude": worker.current_latitude,
                "current_longitude": worker.current_longitude,
                "location_updated_at": worker.location_updated_at,
                "open_visit": (
                    {
                        "visit_id": visit.id,
                        "status": visit.status.value,
                        "elder_name": visit.elder.full_name if visit.elder else None,
                        "address": visit.elder.home_address if visit.elder else None,
                        "latitude": visit.elder.home_latitude if visit.elder else None,
                        "longitude": visit.elder.home_longitude if visit.elder else None,
                    }
                    if visit
                    else None
                ),
                "open_emergency": (
                    {
                        "alert_id": emergency.id,
                        "stage": emergency.current_stage.value,
                        "address": emergency.elder.home_address if emergency.elder else None,
                        "latitude": emergency.elder.home_latitude if emergency.elder else None,
                        "longitude": emergency.elder.home_longitude if emergency.elder else None,
                    }
                    if emergency
                    else None
                ),
            }
        )
    return items
