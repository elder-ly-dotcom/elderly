"""Add SOS worker fanout/payment tracking and elder unit details."""

from alembic import op
import sqlalchemy as sa


revision = "20260405_0007"
down_revision = "20260405_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("elders", sa.Column("flat_label", sa.String(length=255), nullable=True))

    op.add_column(
        "emergency_logs",
        sa.Column("service_fee_amount", sa.Numeric(10, 2), nullable=False, server_default="399"),
    )
    op.add_column(
        "emergency_logs",
        sa.Column("service_fee_paid", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "emergency_logs",
        sa.Column("service_fee_paid_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "emergency_worker_candidates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("emergency_log_id", sa.Integer(), nullable=False),
        sa.Column("worker_id", sa.Integer(), nullable=False),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="NOTIFIED"),
        sa.Column("siren_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["emergency_log_id"], ["emergency_logs.id"]),
        sa.ForeignKeyConstraint(["worker_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_emergency_worker_candidates_emergency_log_id"), "emergency_worker_candidates", ["emergency_log_id"], unique=False)
    op.create_index(op.f("ix_emergency_worker_candidates_worker_id"), "emergency_worker_candidates", ["worker_id"], unique=False)

    op.alter_column("emergency_logs", "service_fee_amount", server_default=None)
    op.alter_column("emergency_logs", "service_fee_paid", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_emergency_worker_candidates_worker_id"), table_name="emergency_worker_candidates")
    op.drop_index(op.f("ix_emergency_worker_candidates_emergency_log_id"), table_name="emergency_worker_candidates")
    op.drop_table("emergency_worker_candidates")

    op.drop_column("emergency_logs", "service_fee_paid_at")
    op.drop_column("emergency_logs", "service_fee_paid")
    op.drop_column("emergency_logs", "service_fee_amount")
    op.drop_column("elders", "flat_label")
