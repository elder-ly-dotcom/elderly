"""Worker profile fields and subscription plan groups."""

from alembic import op
import sqlalchemy as sa


revision = "20260405_0004"
down_revision = "20260405_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("base_location", sa.String(length=255), nullable=True))

    op.add_column("subscriptions", sa.Column("plan_group_id", sa.String(length=64), nullable=True))
    op.execute("UPDATE subscriptions SET plan_group_id = CONCAT('legacy-', id) WHERE plan_group_id IS NULL")
    op.alter_column("subscriptions", "plan_group_id", nullable=False)
    op.create_index("ix_subscriptions_plan_group_id", "subscriptions", ["plan_group_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_subscriptions_plan_group_id", table_name="subscriptions")
    op.drop_column("subscriptions", "plan_group_id")
    op.drop_column("users", "base_location")
