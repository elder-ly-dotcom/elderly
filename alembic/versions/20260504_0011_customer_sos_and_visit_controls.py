"""add customer sos hold window and visit controls

Revision ID: 20260504_0011
Revises: 20260503_0010
Create Date: 2026-05-04 18:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260504_0011"
down_revision = "20260503_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("emergency_logs", sa.Column("dispatch_hold_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("emergency_logs", sa.Column("dispatch_activated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("emergency_logs", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("emergency_logs", sa.Column("cancelled_by_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_emergency_logs_cancelled_by_id_users",
        "emergency_logs",
        "users",
        ["cancelled_by_id"],
        ["id"],
    )
    op.create_index(op.f("ix_emergency_logs_dispatch_hold_until"), "emergency_logs", ["dispatch_hold_until"], unique=False)
    op.create_index(op.f("ix_emergency_logs_dispatch_activated_at"), "emergency_logs", ["dispatch_activated_at"], unique=False)
    op.create_index(op.f("ix_emergency_logs_cancelled_at"), "emergency_logs", ["cancelled_at"], unique=False)
    op.create_index(op.f("ix_emergency_logs_cancelled_by_id"), "emergency_logs", ["cancelled_by_id"], unique=False)

    op.add_column("visits", sa.Column("rescheduled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("visits", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("visits", sa.Column("cancellation_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("visits", "cancellation_reason")
    op.drop_column("visits", "cancelled_at")
    op.drop_column("visits", "rescheduled_at")

    op.drop_index(op.f("ix_emergency_logs_cancelled_by_id"), table_name="emergency_logs")
    op.drop_index(op.f("ix_emergency_logs_cancelled_at"), table_name="emergency_logs")
    op.drop_index(op.f("ix_emergency_logs_dispatch_activated_at"), table_name="emergency_logs")
    op.drop_index(op.f("ix_emergency_logs_dispatch_hold_until"), table_name="emergency_logs")
    op.drop_constraint("fk_emergency_logs_cancelled_by_id_users", "emergency_logs", type_="foreignkey")
    op.drop_column("emergency_logs", "cancelled_by_id")
    op.drop_column("emergency_logs", "cancelled_at")
    op.drop_column("emergency_logs", "dispatch_activated_at")
    op.drop_column("emergency_logs", "dispatch_hold_until")
