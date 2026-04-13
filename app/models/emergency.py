import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class EmergencyStatus(str, enum.Enum):
    PENDING = "PENDING"
    RESPONDED = "RESPONDED"


class EmergencyStage(str, enum.Enum):
    ADMIN_NOTIFIED = "ADMIN_NOTIFIED"
    WORKER_ASSIGNED = "WORKER_ASSIGNED"
    WORKER_ACCEPTED = "WORKER_ACCEPTED"
    WORKER_DELAYED_TRAFFIC = "WORKER_DELAYED_TRAFFIC"
    WORKER_DELAYED_ON_VISIT = "WORKER_DELAYED_ON_VISIT"
    WORKER_ON_THE_WAY = "WORKER_ON_THE_WAY"
    WORKER_REACHED = "WORKER_REACHED"
    WORK_IN_PROGRESS = "WORK_IN_PROGRESS"
    RESOLVED = "RESOLVED"
    NO_WORKER_AVAILABLE = "NO_WORKER_AVAILABLE"


class EmergencyLog(Base):
    __tablename__ = "emergency_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elders.id"), nullable=False, index=True)
    triggered_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    assigned_worker_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    responder_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    trigger_latitude: Mapped[float | None] = mapped_column(nullable=True)
    trigger_longitude: Mapped[float | None] = mapped_column(nullable=True)
    audio_note_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    service_fee_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=399)
    service_fee_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    service_fee_paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    resolution_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    action_taken: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_stage: Mapped[EmergencyStage] = mapped_column(
        Enum(EmergencyStage),
        default=EmergencyStage.ADMIN_NOTIFIED,
        nullable=False,
        index=True,
    )
    status: Mapped[EmergencyStatus] = mapped_column(
        Enum(EmergencyStatus),
        default=EmergencyStatus.PENDING,
        nullable=False,
        index=True,
    )

    elder: Mapped["Elder"] = relationship(back_populates="emergency_logs")
    triggered_by: Mapped["User"] = relationship(
        back_populates="triggered_alerts",
        foreign_keys=[triggered_by_id],
    )
    assigned_worker: Mapped["User | None"] = relationship(
        back_populates="assigned_emergency_alerts",
        foreign_keys=[assigned_worker_id],
    )
    responder: Mapped["User | None"] = relationship(
        back_populates="responded_alerts",
        foreign_keys=[responder_id],
    )
    stage_updates: Mapped[list["EmergencyStageUpdate"]] = relationship(
        back_populates="emergency_log",
        cascade="all, delete-orphan",
    )
    worker_candidates: Mapped[list["EmergencyWorkerCandidate"]] = relationship(
        back_populates="emergency_log",
        cascade="all, delete-orphan",
    )

    @property
    def location_address(self) -> str | None:
        return self.elder.home_address if self.elder else None

    @property
    def elder_name(self) -> str | None:
        return self.elder.full_name if self.elder else None

    @property
    def assigned_worker_name(self) -> str | None:
        return self.assigned_worker.full_name if self.assigned_worker else None

    @property
    def assigned_worker_phone(self) -> str | None:
        return self.assigned_worker.phone_number if self.assigned_worker else None

    @property
    def triggered_by_name(self) -> str | None:
        return self.triggered_by.full_name if self.triggered_by else None

    @property
    def triggered_by_phone(self) -> str | None:
        return self.triggered_by.phone_number if self.triggered_by else None

    @property
    def responder_name(self) -> str | None:
        return self.responder.full_name if self.responder else None

    @property
    def responder_phone(self) -> str | None:
        return self.responder.phone_number if self.responder else None


class EmergencyStageUpdate(Base):
    __tablename__ = "emergency_stage_updates"

    id: Mapped[int] = mapped_column(primary_key=True)
    emergency_log_id: Mapped[int] = mapped_column(
        ForeignKey("emergency_logs.id"),
        nullable=False,
        index=True,
    )
    stage: Mapped[EmergencyStage] = mapped_column(Enum(EmergencyStage), nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    emergency_log: Mapped["EmergencyLog"] = relationship(back_populates="stage_updates")
    updated_by: Mapped["User | None"] = relationship(foreign_keys=[updated_by_id])

    @property
    def updated_by_name(self) -> str | None:
        return self.updated_by.full_name if self.updated_by else None

    @property
    def updated_by_phone(self) -> str | None:
        return self.updated_by.phone_number if self.updated_by else None

    @property
    def updated_by_role(self) -> str | None:
        return self.updated_by.role.value if self.updated_by else None


class EmergencyWorkerCandidate(Base):
    __tablename__ = "emergency_worker_candidates"

    id: Mapped[int] = mapped_column(primary_key=True)
    emergency_log_id: Mapped[int] = mapped_column(
        ForeignKey("emergency_logs.id"),
        nullable=False,
        index=True,
    )
    worker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    distance_km: Mapped[float | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="NOTIFIED")
    siren_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    emergency_log: Mapped["EmergencyLog"] = relationship(back_populates="worker_candidates")
    worker: Mapped["User"] = relationship(foreign_keys=[worker_id])

    @property
    def worker_name(self) -> str | None:
        return self.worker.full_name if self.worker else None

    @property
    def worker_phone(self) -> str | None:
        return self.worker.phone_number if self.worker else None
