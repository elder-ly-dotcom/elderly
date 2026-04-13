"""occasion bookings and worker shifts

Revision ID: 20260413_0009
Revises: 20260407_0008
Create Date: 2026-04-13 22:10:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260413_0009"
down_revision = "20260407_0008"
branch_labels = None
depends_on = None


occasion_status = sa.Enum(
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    name="occasionbookingstatus",
    create_type=False,
)


def upgrade() -> None:
    op.add_column("visits", sa.Column("voice_transcript", sa.Text(), nullable=True))

    op.create_table(
        "worker_shifts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("worker_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["worker_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_worker_shifts_worker_id"), "worker_shifts", ["worker_id"], unique=False)
    op.create_index(op.f("ix_worker_shifts_day_of_week"), "worker_shifts", ["day_of_week"], unique=False)

    op.create_table(
        "occasion_bookings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("primary_elder_id", sa.Integer(), nullable=False),
        sa.Column("assigned_worker_id", sa.Integer(), nullable=True),
        sa.Column("occasion_type", sa.String(length=64), nullable=False),
        sa.Column("package_code", sa.String(length=64), nullable=False),
        sa.Column("package_name", sa.String(length=255), nullable=False),
        sa.Column("package_summary", sa.Text(), nullable=False),
        sa.Column("special_notes", sa.Text(), nullable=True),
        sa.Column("location_address_snapshot", sa.String(length=500), nullable=False),
        sa.Column("scheduled_start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("includes_video_call", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("video_room_name", sa.String(length=255), nullable=True),
        sa.Column("update_summary", sa.Text(), nullable=True),
        sa.Column("photo_gallery_url", sa.String(length=500), nullable=True),
        sa.Column("status", occasion_status, nullable=False, server_default="CONFIRMED"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["assigned_worker_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["primary_elder_id"], ["elders.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_occasion_bookings_customer_id"), "occasion_bookings", ["customer_id"], unique=False)
    op.create_index(op.f("ix_occasion_bookings_primary_elder_id"), "occasion_bookings", ["primary_elder_id"], unique=False)
    op.create_index(op.f("ix_occasion_bookings_assigned_worker_id"), "occasion_bookings", ["assigned_worker_id"], unique=False)
    op.create_index(op.f("ix_occasion_bookings_scheduled_start_time"), "occasion_bookings", ["scheduled_start_time"], unique=False)
    op.create_index(op.f("ix_occasion_bookings_status"), "occasion_bookings", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_occasion_bookings_status"), table_name="occasion_bookings")
    op.drop_index(op.f("ix_occasion_bookings_scheduled_start_time"), table_name="occasion_bookings")
    op.drop_index(op.f("ix_occasion_bookings_assigned_worker_id"), table_name="occasion_bookings")
    op.drop_index(op.f("ix_occasion_bookings_primary_elder_id"), table_name="occasion_bookings")
    op.drop_index(op.f("ix_occasion_bookings_customer_id"), table_name="occasion_bookings")
    op.drop_table("occasion_bookings")

    op.drop_index(op.f("ix_worker_shifts_day_of_week"), table_name="worker_shifts")
    op.drop_index(op.f("ix_worker_shifts_worker_id"), table_name="worker_shifts")
    op.drop_table("worker_shifts")

    op.drop_column("visits", "voice_transcript")
