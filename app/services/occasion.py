from collections import defaultdict
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.elder import Elder
from app.models.occasion import OccasionBooking, OccasionBookingStatus
from app.models.user import Role, User
from app.schemas.occasion import (
    OccasionBookingCreateRequest,
    OccasionBookingDetailsResponse,
    OccasionBookingWorkerUpdate,
    OccasionCatalogItem,
    OccasionSlotOption,
)
from app.services.communications import queue_email, queue_sms
from app.services.notification import connection_manager
from app.services.visit import (
    DISPATCH_RADIUS_KM,
    LOCAL_TZ,
    VISIT_SLOT_DURATION_HOURS,
    VISIT_SLOT_HOURS,
    _find_available_workers_for_slot,
    _get_location_elders_for_customer,
    _slot_label,
)


OCCASION_CATALOG = [
    OccasionCatalogItem(
        code="birthday-classic",
        occasion_type="Birthday Visit",
        name="Birthday Memory Visit",
        emotional_line="Even if you are far away, we help you celebrate with your loved one without any headache.",
        price=2499,
        inclusions=["Valet visit", "Decor setup", "Cake", "Candles", "Photo updates"],
        includes_video_call=True,
    ),
    OccasionCatalogItem(
        code="festival-joy",
        occasion_type="Festival Visit",
        name="Festival Joy Package",
        emotional_line="Bring warmth home from anywhere with our thoughtful festival celebration support.",
        price=2999,
        inclusions=["Valet visit", "Decor setup", "Favourite festive food", "Family video-call assist", "Photo updates"],
        includes_video_call=True,
    ),
    OccasionCatalogItem(
        code="anniversary-gold",
        occasion_type="Anniversary Visit",
        name="Anniversary Gold Package",
        emotional_line="Celebrate together, even from far away, while ELDERLY arranges every beautiful detail on your behalf.",
        price=3499,
        inclusions=["Valet visit", "Premium decoration", "Cake", "Candles", "Favourite food", "Celebration photo album"],
        includes_video_call=True,
    ),
]


OCCASION_RELATIONSHIP_OPTIONS = (
    selectinload(OccasionBooking.customer),
    selectinload(OccasionBooking.assigned_worker),
    selectinload(OccasionBooking.primary_elder).selectinload(Elder.customer),
)


def _find_package(package_code: str) -> OccasionCatalogItem:
    for item in OCCASION_CATALOG:
        if item.code == package_code:
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Celebration package not found")


async def list_occasion_slots(
    session: AsyncSession,
    *,
    customer: User,
    elder_id: int | None = None,
    location_address: str | None = None,
) -> list[OccasionSlotOption]:
    location_elders = await _get_location_elders_for_customer(
        session,
        customer_id=customer.id,
        elder_id=elder_id,
        location_address=location_address,
    )
    anchor = location_elders[0]
    now_local = datetime.now(LOCAL_TZ)
    slots: list[OccasionSlotOption] = []
    for day_offset in range(1, 15):
        day = (now_local + timedelta(days=day_offset)).date()
        for hour in VISIT_SLOT_HOURS:
            slot_start_local = datetime(day.year, day.month, day.day, hour, 0, tzinfo=LOCAL_TZ)
            if slot_start_local <= now_local + timedelta(hours=24):
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
                OccasionSlotOption(
                    start_time=slot_start,
                    end_time=slot_end,
                    label=_slot_label(slot_start),
                    available_workers=len(workers),
                )
            )
    return slots


async def create_occasion_booking(
    session: AsyncSession,
    *,
    customer: User,
    payload: OccasionBookingCreateRequest,
) -> OccasionBooking:
    package = _find_package(payload.package_code)
    location_elders = await _get_location_elders_for_customer(
        session,
        customer_id=customer.id,
        elder_id=payload.elder_id,
        location_address=payload.location_address,
    )
    anchor = location_elders[0]
    slot_start = payload.scheduled_start_time.astimezone(UTC)
    if slot_start < datetime.now(UTC) + timedelta(hours=24):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Celebration services must be booked at least 1 day in advance.")
    slot_end = slot_start + timedelta(hours=VISIT_SLOT_DURATION_HOURS)
    workers = await _find_available_workers_for_slot(
        session,
        latitude=anchor.home_latitude,
        longitude=anchor.home_longitude,
        slot_start=slot_start,
        slot_end=slot_end,
    )
    if not workers:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No worker is available for this celebration slot.")
    assigned_worker, _ = workers[0]
    room_name = f"elderly-celebrate-{uuid4().hex[:10]}" if package.includes_video_call else None
    booking = OccasionBooking(
        customer_id=customer.id,
        primary_elder_id=anchor.id,
        assigned_worker_id=assigned_worker.id,
        occasion_type=package.occasion_type,
        package_code=package.code,
        package_name=package.name,
        package_summary=", ".join(package.inclusions),
        special_notes=payload.special_notes,
        location_address_snapshot=anchor.home_address,
        scheduled_start_time=slot_start,
        scheduled_end_time=slot_end,
        total_price=package.price,
        includes_video_call=package.includes_video_call,
        video_room_name=room_name,
        status=OccasionBookingStatus.CONFIRMED,
    )
    session.add(booking)
    await session.commit()
    result = await session.execute(select(OccasionBooking).options(*OCCASION_RELATIONSHIP_OPTIONS).where(OccasionBooking.id == booking.id))
    booking = result.scalar_one()

    elder_names = ", ".join(item.full_name for item in location_elders)
    queue_email(
        recipients=[customer.email],
        subject=f"ELDERLY {package.occasion_type} booking confirmed",
        text_body=(
            f"Hi {customer.full_name},\n\n"
            f"Your {package.name} is confirmed for {_slot_label(slot_start)}.\n"
            f"Location: {anchor.home_address}\n"
            f"Elders: {elder_names}\n"
            f"Assigned worker: {assigned_worker.full_name}\n"
            f"Amount: Rs. {package.price:.0f}\n"
            f"{'Video room code: ' + room_name if room_name else ''}\n\n"
            "You can view the booking and join the celebration from your customer portal.\n\n"
            "Thank you,\nELDERLY"
        ),
    )
    queue_email(
        recipients=[assigned_worker.email],
        subject=f"ELDERLY celebration duty assigned: {package.occasion_type}",
        text_body=(
            f"Hi {assigned_worker.full_name},\n\n"
            f"You have been assigned a {package.occasion_type} on {_slot_label(slot_start)}.\n"
            f"Location: {anchor.home_address}\n"
            f"Elders: {elder_names}\n"
            f"Package: {package.name}\n\n"
            "Please check the worker portal for the service details.\n\n"
            "Thank you,\nELDERLY"
        ),
    )
    queue_sms(
        recipients=[customer.phone_number],
        body=f"ELDERLY: {package.occasion_type} confirmed for {_slot_label(slot_start)} at {anchor.home_address}.",
    )
    await connection_manager.notify_worker(
        assigned_worker.id,
        {
            "type": "occasion_booking",
            "booking_id": booking.id,
            "occasion_type": booking.occasion_type,
            "location_address": booking.location_address_snapshot,
            "scheduled_start_time": booking.scheduled_start_time.isoformat(),
            "message": f"Celebration duty assigned for {_slot_label(slot_start)}.",
        },
    )
    return booking


async def list_customer_occasion_bookings(session: AsyncSession, *, customer: User) -> list[OccasionBooking]:
    result = await session.execute(
        select(OccasionBooking)
        .options(*OCCASION_RELATIONSHIP_OPTIONS)
        .where(OccasionBooking.customer_id == customer.id)
        .order_by(desc(OccasionBooking.scheduled_start_time))
    )
    return list(result.scalars().all())


async def list_worker_occasion_bookings(session: AsyncSession, *, worker: User) -> list[OccasionBooking]:
    result = await session.execute(
        select(OccasionBooking)
        .options(*OCCASION_RELATIONSHIP_OPTIONS)
        .where(OccasionBooking.assigned_worker_id == worker.id)
        .order_by(OccasionBooking.scheduled_start_time.asc())
    )
    return list(result.scalars().all())


async def get_occasion_booking_details(
    session: AsyncSession,
    *,
    booking_id: int,
    customer: User | None = None,
    worker: User | None = None,
) -> OccasionBookingDetailsResponse:
    result = await session.execute(
        select(OccasionBooking).options(*OCCASION_RELATIONSHIP_OPTIONS).where(OccasionBooking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Celebration booking not found")
    if customer and booking.customer_id != customer.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if worker and booking.assigned_worker_id != worker.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    elders_result = await session.execute(
        select(Elder).where(
            Elder.customer_id == booking.customer_id,
            Elder.home_address == booking.location_address_snapshot,
        )
    )
    elders = elders_result.scalars().all()
    now = datetime.now(UTC)
    can_join = booking.includes_video_call and (booking.scheduled_start_time - timedelta(minutes=15) <= now <= booking.scheduled_end_time + timedelta(hours=1))
    return OccasionBookingDetailsResponse(
        booking=booking,
        elder_names=[elder.full_name for elder in elders],
        can_join_video_call=can_join,
    )


async def update_occasion_booking_for_worker(
    session: AsyncSession,
    *,
    booking_id: int,
    worker: User,
    payload: OccasionBookingWorkerUpdate,
) -> OccasionBooking:
    result = await session.execute(
        select(OccasionBooking)
        .options(*OCCASION_RELATIONSHIP_OPTIONS)
        .where(OccasionBooking.id == booking_id, OccasionBooking.assigned_worker_id == worker.id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Celebration booking not found")
    booking.status = payload.status
    booking.update_summary = payload.update_summary
    booking.photo_gallery_url = payload.photo_gallery_url
    await session.commit()
    await session.refresh(booking)
    return booking


def get_occasion_catalog() -> list[OccasionCatalogItem]:
    return OCCASION_CATALOG
