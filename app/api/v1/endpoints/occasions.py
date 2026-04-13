from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import require_roles
from app.db.session import get_db
from app.models.user import Role, User
from app.schemas.occasion import (
    OccasionBookingCreateRequest,
    OccasionBookingDetailsResponse,
    OccasionBookingResponse,
    OccasionBookingWorkerUpdate,
    OccasionCatalogItem,
    OccasionSlotOption,
)
from app.services.occasion import (
    create_occasion_booking,
    get_occasion_booking_details,
    get_occasion_catalog,
    list_customer_occasion_bookings,
    list_occasion_slots,
    list_worker_occasion_bookings,
    update_occasion_booking_for_worker,
)


router = APIRouter()


@router.get("/catalog", response_model=list[OccasionCatalogItem])
async def occasion_catalog() -> list[OccasionCatalogItem]:
    return get_occasion_catalog()


@router.get("/slots", response_model=list[OccasionSlotOption])
async def occasion_slots(
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
    elder_id: int | None = None,
    location_address: str | None = None,
) -> list[OccasionSlotOption]:
    return await list_occasion_slots(
        db,
        customer=customer,
        elder_id=elder_id,
        location_address=location_address,
    )


@router.post("/book", response_model=OccasionBookingResponse, status_code=status.HTTP_201_CREATED)
async def book_occasion(
    payload: OccasionBookingCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> OccasionBookingResponse:
    booking = await create_occasion_booking(db, customer=customer, payload=payload)
    return OccasionBookingResponse.model_validate(booking)


@router.get("/customer", response_model=list[OccasionBookingResponse])
async def customer_occasion_bookings(
    db: Annotated[AsyncSession, Depends(get_db)],
    customer: Annotated[User, Depends(require_roles(Role.CUSTOMER))],
) -> list[OccasionBookingResponse]:
    rows = await list_customer_occasion_bookings(db, customer=customer)
    return [OccasionBookingResponse.model_validate(item) for item in rows]


@router.get("/worker", response_model=list[OccasionBookingResponse])
async def worker_occasion_bookings(
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> list[OccasionBookingResponse]:
    rows = await list_worker_occasion_bookings(db, worker=worker)
    return [OccasionBookingResponse.model_validate(item) for item in rows]


@router.get("/{booking_id}/details", response_model=OccasionBookingDetailsResponse)
async def occasion_booking_details(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(Role.CUSTOMER, Role.WORKER))],
) -> OccasionBookingDetailsResponse:
    if user.role == Role.CUSTOMER:
        return await get_occasion_booking_details(db, booking_id=booking_id, customer=user)
    return await get_occasion_booking_details(db, booking_id=booking_id, worker=user)


@router.patch("/{booking_id}/worker", response_model=OccasionBookingResponse)
async def update_worker_occasion(
    booking_id: int,
    payload: OccasionBookingWorkerUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    worker: Annotated[User, Depends(require_roles(Role.WORKER))],
) -> OccasionBookingResponse:
    booking = await update_occasion_booking_for_worker(db, booking_id=booking_id, worker=worker, payload=payload)
    return OccasionBookingResponse.model_validate(booking)
