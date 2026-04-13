from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.visit import (
    AdminVisitRequestItem,
    VisitBookingDetailsResponse,
    VisitCheckInRequest,
    VisitCheckOutRequest,
    VisitRequestCreate,
    VisitResponse,
    VisitScheduleRequest,
    VisitSlotOption,
    VisitVerifyResponse,
    WorkerUpcomingVisitItem,
    WorkerAssignedElder,
    WorkerDispatchStatusUpdate,
)
from app.services.elder import get_elder_by_id
from app.services.visit import (
    check_in_visit,
    end_visit,
    get_active_visit_for_worker,
    get_visit_booking_details,
    list_assigned_elders,
    list_available_visit_slots,
    list_customer_scheduled_visits,
    list_worker_upcoming_visits,
    request_visit_dispatch,
    schedule_visit_request,
    update_worker_dispatch_status,
)


router = APIRouter()


@router.post("/check-in", response_model=VisitResponse)
async def visit_check_in(
    payload: VisitCheckInRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> VisitResponse:
    elder = await get_elder_by_id(db, payload.elder_id)
    if elder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")
    visit = await check_in_visit(
        db,
        worker=worker,
        elder=elder,
        payload=payload,
    )
    return VisitResponse.model_validate(visit)


@router.post("/verify", response_model=VisitVerifyResponse)
async def visit_verify(
    payload: VisitCheckInRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> VisitVerifyResponse:
    elder = await get_elder_by_id(db, payload.elder_id)
    if elder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Elder not found")
    visit = await check_in_visit(
        db,
        worker=worker,
        elder=elder,
        payload=payload,
    )
    response = VisitResponse.model_validate(visit)
    return VisitVerifyResponse(
        visit=response,
        allowed=visit.status.value == "ACTIVE",
        distance_meters=visit.distance_meters or 0,
    )


@router.get("/assigned-elders", response_model=list[WorkerAssignedElder])
async def assigned_elders(
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> list[WorkerAssignedElder]:
    return await list_assigned_elders(db, worker)


@router.get("/active", response_model=VisitResponse | None)
async def active_visit(
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> VisitResponse | None:
    visit = await get_active_visit_for_worker(db, worker)
    if visit is None:
        return None
    return VisitResponse.model_validate(visit)


@router.post("/request", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
async def request_visit(
    payload: VisitRequestCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> VisitResponse:
    visit = await request_visit_dispatch(db, customer=customer, payload=payload)
    return VisitResponse.model_validate(visit)


@router.get("/slots", response_model=list[VisitSlotOption])
async def visit_slots(
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
    elder_id: int | None = None,
    location_address: str | None = None,
) -> list[VisitSlotOption]:
    return await list_available_visit_slots(
        db,
        customer=customer,
        elder_id=elder_id,
        location_address=location_address,
    )


@router.post("/schedule", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
async def schedule_visit(
    payload: VisitScheduleRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> VisitResponse:
    visit = await schedule_visit_request(db, customer=customer, payload=payload)
    return VisitResponse.model_validate(visit)


@router.get("/customer/upcoming", response_model=list[VisitBookingDetailsResponse])
async def customer_upcoming_visits(
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> list[VisitBookingDetailsResponse]:
    return await list_customer_scheduled_visits(db, customer=customer)


@router.get("/worker/upcoming", response_model=list[WorkerUpcomingVisitItem])
async def worker_upcoming_visits(
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> list[WorkerUpcomingVisitItem]:
    return await list_worker_upcoming_visits(db, worker=worker)


@router.get("/{visit_id}/details", response_model=VisitBookingDetailsResponse)
async def visit_details(
    visit_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.CUSTOMER, Role.WORKER))],
) -> VisitBookingDetailsResponse:
    if user.role == Role.CUSTOMER:
        return await get_visit_booking_details(db, visit_id=visit_id, customer=user)
    return await get_visit_booking_details(db, visit_id=visit_id, worker=user)


@router.post("/worker-status", response_model=dict[str, str])
async def update_worker_status(
    payload: WorkerDispatchStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> dict[str, str]:
    await update_worker_dispatch_status(db, worker=worker, payload=payload)
    return {"status": "updated"}


@router.post("/{visit_id}/check-out", response_model=VisitResponse)
async def visit_check_out(
    visit_id: int,
    payload: VisitCheckOutRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> VisitResponse:
    visit = await end_visit(db, worker=worker, visit_id=visit_id, payload=payload)
    return VisitResponse.model_validate(visit)
