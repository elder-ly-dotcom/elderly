"""Add scheduled visit booking fields."""

from alembic import op
import sqlalchemy as sa


revision = "20260407_0008"
down_revision = "20260405_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("visits", sa.Column("requested_by_id", sa.Integer(), nullable=True))
    op.add_column("visits", sa.Column("scheduled_start_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("visits", sa.Column("scheduled_end_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("visits", sa.Column("location_address_snapshot", sa.String(length=500), nullable=True))
    op.create_index(op.f("ix_visits_requested_by_id"), "visits", ["requested_by_id"], unique=False)
    op.create_index(op.f("ix_visits_scheduled_start_time"), "visits", ["scheduled_start_time"], unique=False)
    op.create_foreign_key("fk_visits_requested_by_id_users", "visits", "users", ["requested_by_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_visits_requested_by_id_users", "visits", type_="foreignkey")
    op.drop_index(op.f("ix_visits_scheduled_start_time"), table_name="visits")
    op.drop_index(op.f("ix_visits_requested_by_id"), table_name="visits")
    op.drop_column("visits", "location_address_snapshot")
    op.drop_column("visits", "scheduled_end_time")
    op.drop_column("visits", "scheduled_start_time")
    op.drop_column("visits", "requested_by_id")
