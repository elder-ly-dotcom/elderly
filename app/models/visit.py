import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VisitStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(primary_key=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elders.id"), nullable=False, index=True)
    requested_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    scheduled_start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    scheduled_end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    location_address_snapshot: Mapped[str | None] = mapped_column(String(500), nullable=True)
    start_otp: Mapped[str | None] = mapped_column(String(8), nullable=True)
    otp_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_in_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    start_latitude: Mapped[float | None] = mapped_column(nullable=True)
    start_longitude: Mapped[float | None] = mapped_column(nullable=True)
    end_latitude: Mapped[float | None] = mapped_column(nullable=True)
    end_longitude: Mapped[float | None] = mapped_column(nullable=True)
    status: Mapped[VisitStatus] = mapped_column(
        Enum(VisitStatus),
        default=VisitStatus.PENDING,
        nullable=False,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    mood_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    photo_start_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    photo_end_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    voice_note_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    voice_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    distance_meters: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    worker: Mapped["User"] = relationship(back_populates="visits", foreign_keys=[worker_id])
    elder: Mapped["Elder"] = relationship(back_populates="visits")
    requested_by: Mapped["User | None"] = relationship(foreign_keys=[requested_by_id])
    tasks: Mapped[list["VisitTask"]] = relationship(
        back_populates="visit",
        cascade="all, delete-orphan",
    )
    images: Mapped[list["VisitImage"]] = relationship(
        back_populates="visit",
        cascade="all, delete-orphan",
    )

    @property
    def worker_name(self) -> str | None:
        return self.worker.full_name if self.worker else None

    @property
    def elder_name(self) -> str | None:
        return self.elder.full_name if self.elder else None

    @property
    def requested_by_name(self) -> str | None:
        return self.requested_by.full_name if self.requested_by else None


class VisitTask(Base):
    __tablename__ = "visit_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    visit_id: Mapped[int] = mapped_column(ForeignKey("visits.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    visit: Mapped["Visit"] = relationship(back_populates="tasks")


class VisitImage(Base):
    __tablename__ = "visit_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    visit_id: Mapped[int] = mapped_column(ForeignKey("visits.id"), nullable=False, index=True)
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    image_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_backend: Mapped[str] = mapped_column(String(50), nullable=False, default="local")
    storage_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    visit: Mapped["Visit"] = relationship(back_populates="images")
    uploaded_by: Mapped["User | None"] = relationship(back_populates="visit_images")
