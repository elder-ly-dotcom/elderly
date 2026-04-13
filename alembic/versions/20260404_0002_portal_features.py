"""Portal and emergency features."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260404_0002"
down_revision = "20260404_0001"
branch_labels = None
depends_on = None


emergency_status_enum = postgresql.ENUM(
    "PENDING",
    "RESPONDED",
    name="emergencystatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    emergency_status_enum.create(bind, checkfirst=True)

    op.add_column("users", sa.Column("fcm_token", sa.String(length=512), nullable=True))
    op.add_column(
        "users",
        sa.Column("verification_document_url", sa.String(length=500), nullable=True),
    )

    op.add_column("elders", sa.Column("age", sa.Integer(), nullable=True))
    op.execute("UPDATE elders SET age = 60 WHERE age IS NULL")
    op.alter_column("elders", "age", nullable=False)

    op.add_column("visits", sa.Column("distance_meters", sa.Float(), nullable=True))

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("elder_id", sa.Integer(), sa.ForeignKey("elders.id"), nullable=False),
        sa.Column("service_tier_code", sa.String(length=100), nullable=False),
        sa.Column("service_tier_name", sa.String(length=255), nullable=False),
        sa.Column("add_ons", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("billing_cycle", sa.String(length=50), nullable=False, server_default="monthly"),
        sa.Column("total_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_subscriptions_customer_id", "subscriptions", ["customer_id"], unique=False)
    op.create_index("ix_subscriptions_elder_id", "subscriptions", ["elder_id"], unique=False)
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"], unique=False)

    op.create_table(
        "emergency_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("elder_id", sa.Integer(), sa.ForeignKey("elders.id"), nullable=False),
        sa.Column("triggered_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("responder_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("trigger_latitude", sa.Float(), nullable=True),
        sa.Column("trigger_longitude", sa.Float(), nullable=True),
        sa.Column("audio_note_url", sa.String(length=500), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolution_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("action_taken", sa.Text(), nullable=True),
        sa.Column("status", emergency_status_enum, nullable=False, server_default="PENDING"),
    )
    op.create_index("ix_emergency_logs_elder_id", "emergency_logs", ["elder_id"], unique=False)
    op.create_index("ix_emergency_logs_triggered_by_id", "emergency_logs", ["triggered_by_id"], unique=False)
    op.create_index("ix_emergency_logs_responder_id", "emergency_logs", ["responder_id"], unique=False)
    op.create_index("ix_emergency_logs_status", "emergency_logs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_emergency_logs_status", table_name="emergency_logs")
    op.drop_index("ix_emergency_logs_responder_id", table_name="emergency_logs")
    op.drop_index("ix_emergency_logs_triggered_by_id", table_name="emergency_logs")
    op.drop_index("ix_emergency_logs_elder_id", table_name="emergency_logs")
    op.drop_table("emergency_logs")

    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_index("ix_subscriptions_elder_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_customer_id", table_name="subscriptions")
    op.drop_table("subscriptions")

    op.drop_column("visits", "distance_meters")
    op.drop_column("elders", "age")
    op.drop_column("users", "verification_document_url")
    op.drop_column("users", "fcm_token")

    bind = op.get_bind()
    emergency_status_enum.drop(bind, checkfirst=True)
