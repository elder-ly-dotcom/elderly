"""Expand emergency stage enum for worker acceptance flow."""

from alembic import op


revision = "20260405_0006"
down_revision = "20260405_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE emergencystage ADD VALUE IF NOT EXISTS 'WORKER_ACCEPTED'")
    op.execute("ALTER TYPE emergencystage ADD VALUE IF NOT EXISTS 'WORKER_DELAYED_TRAFFIC'")
    op.execute("ALTER TYPE emergencystage ADD VALUE IF NOT EXISTS 'WORKER_DELAYED_ON_VISIT'")


def downgrade() -> None:
    # PostgreSQL enum value removal is intentionally omitted.
    pass
