from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    elder_id: Mapped[int] = mapped_column(ForeignKey("elders.id"), nullable=False, index=True)
    plan_group_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    service_tier_code: Mapped[str] = mapped_column(String(100), nullable=False)
    service_tier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    add_ons: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(50), default="monthly", nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    customer: Mapped["User"] = relationship(back_populates="subscriptions")
    elder: Mapped["Elder"] = relationship(back_populates="subscriptions")

    @property
    def customer_name(self) -> str | None:
        return self.customer.full_name if self.customer else None

    @property
    def elder_name(self) -> str | None:
        return self.elder.full_name if self.elder else None
