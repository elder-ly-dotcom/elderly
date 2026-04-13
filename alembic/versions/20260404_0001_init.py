"""Initial schema."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260404_0001"
down_revision = None
branch_labels = None
depends_on = None


role_enum = postgresql.ENUM("CUSTOMER", "WORKER", "ADMIN", name="role", create_type=False)
visit_status_enum = postgresql.ENUM(
    "PENDING",
    "ACTIVE",
    "COMPLETED",
    "REJECTED",
    name="visitstatus",
    create_type=False,
)
audit_action_enum = postgresql.ENUM(
    "CHECK_IN_ATTEMPT",
    "WORKER_ACTION",
    "VISIT_COMPLETED",
    "SOS_TRIGGERED",
    name="auditactiontype",
    create_type=False,
)
sos_status_enum = postgresql.ENUM(
    "PENDING",
    "SENT",
    "FAILED",
    name="sosstatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    role_enum.create(bind, checkfirst=True)
    visit_status_enum.create(bind, checkfirst=True)
    audit_action_enum.create(bind, checkfirst=True)
    sos_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=True),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "elders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assigned_worker_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("home_address", sa.String(length=500), nullable=False),
        sa.Column("home_latitude", sa.Float(), nullable=False),
        sa.Column("home_longitude", sa.Float(), nullable=False),
        sa.Column("pod_name", sa.String(length=255), nullable=True),
        sa.Column("emergency_contact_name", sa.String(length=255), nullable=True),
        sa.Column("emergency_contact_phone", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_elders_customer_id", "elders", ["customer_id"], unique=False)
    op.create_index("ix_elders_assigned_worker_id", "elders", ["assigned_worker_id"], unique=False)

    op.create_table(
        "visits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("worker_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("elder_id", sa.Integer(), sa.ForeignKey("elders.id"), nullable=False),
        sa.Column("check_in_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("start_latitude", sa.Float(), nullable=True),
        sa.Column("start_longitude", sa.Float(), nullable=True),
        sa.Column("end_latitude", sa.Float(), nullable=True),
        sa.Column("end_longitude", sa.Float(), nullable=True),
        sa.Column("status", visit_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("mood_photo_url", sa.String(length=500), nullable=True),
        sa.Column("voice_note_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_visits_worker_id", "visits", ["worker_id"], unique=False)
    op.create_index("ix_visits_elder_id", "visits", ["elder_id"], unique=False)
    op.create_index("ix_visits_status", "visits", ["status"], unique=False)

    op.create_table(
        "visit_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("visit_id", sa.Integer(), sa.ForeignKey("visits.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_visit_tasks_visit_id", "visit_tasks", ["visit_id"], unique=False)

    op.create_table(
        "audit_trails",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action_type", audit_action_enum, nullable=False),
        sa.Column("action", sa.String(length=255), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_trails_user_id", "audit_trails", ["user_id"], unique=False)

    op.create_table(
        "sos_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("elder_id", sa.Integer(), sa.ForeignKey("elders.id"), nullable=False),
        sa.Column("triggered_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("status", sos_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("dispatch_result", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_sos_alerts_elder_id", "sos_alerts", ["elder_id"], unique=False)
    op.create_index("ix_sos_alerts_triggered_by_id", "sos_alerts", ["triggered_by_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sos_alerts_triggered_by_id", table_name="sos_alerts")
    op.drop_index("ix_sos_alerts_elder_id", table_name="sos_alerts")
    op.drop_table("sos_alerts")

    op.drop_index("ix_audit_trails_user_id", table_name="audit_trails")
    op.drop_table("audit_trails")

    op.drop_index("ix_visit_tasks_visit_id", table_name="visit_tasks")
    op.drop_table("visit_tasks")

    op.drop_index("ix_visits_status", table_name="visits")
    op.drop_index("ix_visits_elder_id", table_name="visits")
    op.drop_index("ix_visits_worker_id", table_name="visits")
    op.drop_table("visits")

    op.drop_index("ix_elders_assigned_worker_id", table_name="elders")
    op.drop_index("ix_elders_customer_id", table_name="elders")
    op.drop_table("elders")

    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    sos_status_enum.drop(bind, checkfirst=True)
    audit_action_enum.drop(bind, checkfirst=True)
    visit_status_enum.drop(bind, checkfirst=True)
    role_enum.drop(bind, checkfirst=True)
