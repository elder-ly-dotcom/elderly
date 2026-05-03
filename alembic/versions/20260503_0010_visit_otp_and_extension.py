"""add visit otp support

Revision ID: 20260503_0010
Revises: 20260413_0009
Create Date: 2026-05-03 10:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260503_0010"
down_revision = "20260413_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("visits", sa.Column("start_otp", sa.String(length=8), nullable=True))
    op.add_column("visits", sa.Column("otp_verified_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("visits", "otp_verified_at")
    op.drop_column("visits", "start_otp")
