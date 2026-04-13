import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuditActionType(str, enum.Enum):
    CHECK_IN_ATTEMPT = "CHECK_IN_ATTEMPT"
    WORKER_ACTION = "WORKER_ACTION"
    VISIT_COMPLETED = "VISIT_COMPLETED"
    SOS_TRIGGERED = "SOS_TRIGGERED"


class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    action_type: Mapped[AuditActionType] = mapped_column(Enum(AuditActionType), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
