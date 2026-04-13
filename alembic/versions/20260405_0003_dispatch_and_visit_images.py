"""Dispatch and visit evidence updates."""

from alembic import op
import sqlalchemy as sa


revision = "20260405_0003"
down_revision = "20260404_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("available_for_dispatch", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column("users", sa.Column("current_latitude", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("current_longitude", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("location_updated_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("visits", sa.Column("photo_start_url", sa.String(length=500), nullable=True))
    op.add_column("visits", sa.Column("photo_end_url", sa.String(length=500), nullable=True))

    op.create_table(
        "visit_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("visit_id", sa.Integer(), sa.ForeignKey("visits.id"), nullable=False),
        sa.Column("uploaded_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("image_type", sa.String(length=20), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("storage_backend", sa.String(length=50), nullable=False, server_default="local"),
        sa.Column("storage_key", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_visit_images_visit_id", "visit_images", ["visit_id"], unique=False)
    op.create_index("ix_visit_images_uploaded_by_id", "visit_images", ["uploaded_by_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_visit_images_uploaded_by_id", table_name="visit_images")
    op.drop_index("ix_visit_images_visit_id", table_name="visit_images")
    op.drop_table("visit_images")

    op.drop_column("visits", "photo_end_url")
    op.drop_column("visits", "photo_start_url")

    op.drop_column("users", "location_updated_at")
    op.drop_column("users", "current_longitude")
    op.drop_column("users", "current_latitude")
    op.drop_column("users", "available_for_dispatch")
