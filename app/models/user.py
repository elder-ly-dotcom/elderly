import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Role(str, enum.Enum):
    CUSTOMER = "Customer"
    WORKER = "Worker"
    ADMIN = "Admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    base_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fcm_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    verification_document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    available_for_dispatch: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    current_latitude: Mapped[float | None] = mapped_column(nullable=True)
    current_longitude: Mapped[float | None] = mapped_column(nullable=True)
    location_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    customer_elders: Mapped[list["Elder"]] = relationship(
        back_populates="customer",
        foreign_keys="Elder.customer_id",
    )
    assigned_elders: Mapped[list["Elder"]] = relationship(
        back_populates="assigned_worker",
        foreign_keys="Elder.assigned_worker_id",
    )
    visits: Mapped[list["Visit"]] = relationship(back_populates="worker", foreign_keys="Visit.worker_id")
    requested_visits: Mapped[list["Visit"]] = relationship(foreign_keys="Visit.requested_by_id")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="customer")
    triggered_alerts: Mapped[list["EmergencyLog"]] = relationship(
        back_populates="triggered_by",
        foreign_keys="EmergencyLog.triggered_by_id",
    )
    responded_alerts: Mapped[list["EmergencyLog"]] = relationship(
        back_populates="responder",
        foreign_keys="EmergencyLog.responder_id",
    )
    assigned_emergency_alerts: Mapped[list["EmergencyLog"]] = relationship(
        back_populates="assigned_worker",
        foreign_keys="EmergencyLog.assigned_worker_id",
    )
    emergency_candidate_alerts: Mapped[list["EmergencyWorkerCandidate"]] = relationship(
        foreign_keys="EmergencyWorkerCandidate.worker_id",
    )
    visit_images: Mapped[list["VisitImage"]] = relationship(back_populates="uploaded_by")
    worker_shifts: Mapped[list["WorkerShift"]] = relationship(
        back_populates="worker",
        cascade="all, delete-orphan",
    )
    occasion_bookings: Mapped[list["OccasionBooking"]] = relationship(
        back_populates="customer",
        foreign_keys="OccasionBooking.customer_id",
    )
    assigned_occasion_bookings: Mapped[list["OccasionBooking"]] = relationship(
        back_populates="assigned_worker",
        foreign_keys="OccasionBooking.assigned_worker_id",
    )

    @property
    def is_active_today(self) -> bool:
        if not self.location_updated_at:
            return False
        return self.location_updated_at.date() == datetime.utcnow().date()


# Ensure the emergency model is registered even when User is imported first.
from app.models import emergency as _emergency  # noqa: E402,F401
from app.models import occasion as _occasion  # noqa: E402,F401
from app.models import worker_shift as _worker_shift  # noqa: E402,F401
