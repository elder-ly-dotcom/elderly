import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class OccasionBookingStatus(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class OccasionBooking(Base):
    __tablename__ = "occasion_bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    primary_elder_id: Mapped[int] = mapped_column(ForeignKey("elders.id"), nullable=False, index=True)
    assigned_worker_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    occasion_type: Mapped[str] = mapped_column(String(64), nullable=False)
    package_code: Mapped[str] = mapped_column(String(64), nullable=False)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False)
    package_summary: Mapped[str] = mapped_column(Text, nullable=False)
    special_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_address_snapshot: Mapped[str] = mapped_column(String(500), nullable=False)
    scheduled_start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    scheduled_end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    includes_video_call: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    video_room_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    update_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_gallery_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[OccasionBookingStatus] = mapped_column(
        Enum(OccasionBookingStatus),
        nullable=False,
        default=OccasionBookingStatus.CONFIRMED,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    customer: Mapped["User"] = relationship(
        back_populates="occasion_bookings",
        foreign_keys=[customer_id],
    )
    assigned_worker: Mapped["User | None"] = relationship(
        back_populates="assigned_occasion_bookings",
        foreign_keys=[assigned_worker_id],
    )
    primary_elder: Mapped["Elder"] = relationship(foreign_keys=[primary_elder_id])

    @property
    def customer_name(self) -> str | None:
        return self.customer.full_name if self.customer else None

    @property
    def customer_phone(self) -> str | None:
        return self.customer.phone_number if self.customer else None

    @property
    def worker_name(self) -> str | None:
        return self.assigned_worker.full_name if self.assigned_worker else None

    @property
    def worker_phone(self) -> str | None:
        return self.assigned_worker.phone_number if self.assigned_worker else None
