from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Elder(Base):
    __tablename__ = "elders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    assigned_worker_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    flat_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    home_address: Mapped[str] = mapped_column(String(500), nullable=False)
    home_latitude: Mapped[float] = mapped_column(nullable=False)
    home_longitude: Mapped[float] = mapped_column(nullable=False)
    pod_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    customer: Mapped["User"] = relationship(
        back_populates="customer_elders",
        foreign_keys=[customer_id],
    )
    assigned_worker: Mapped["User | None"] = relationship(
        back_populates="assigned_elders",
        foreign_keys=[assigned_worker_id],
    )
    visits: Mapped[list["Visit"]] = relationship(back_populates="elder")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="elder")
    emergency_logs: Mapped[list["EmergencyLog"]] = relationship(back_populates="elder")
