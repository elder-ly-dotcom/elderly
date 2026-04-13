"""Emergency auto assignment and stage timeline."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260405_0005"
down_revision = "20260405_0004"
branch_labels = None
depends_on = None


emergency_stage_enum = postgresql.ENUM(
    "ADMIN_NOTIFIED",
    "WORKER_ASSIGNED",
    "WORKER_ON_THE_WAY",
    "WORKER_REACHED",
    "WORK_IN_PROGRESS",
    "RESOLVED",
    "NO_WORKER_AVAILABLE",
    name="emergencystage",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    emergency_stage_enum.create(bind, checkfirst=True)

    op.add_column("emergency_logs", sa.Column("assigned_worker_id", sa.Integer(), nullable=True))
    op.add_column(
        "emergency_logs",
        sa.Column("current_stage", emergency_stage_enum, nullable=False, server_default="ADMIN_NOTIFIED"),
    )
    op.create_index("ix_emergency_logs_assigned_worker_id", "emergency_logs", ["assigned_worker_id"], unique=False)
    op.create_index("ix_emergency_logs_current_stage", "emergency_logs", ["current_stage"], unique=False)
    op.create_foreign_key(
        "fk_emergency_logs_assigned_worker_id_users",
        "emergency_logs",
        "users",
        ["assigned_worker_id"],
        ["id"],
    )

    op.create_table(
        "emergency_stage_updates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("emergency_log_id", sa.Integer(), sa.ForeignKey("emergency_logs.id"), nullable=False),
        sa.Column("stage", emergency_stage_enum, nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_emergency_stage_updates_emergency_log_id",
        "emergency_stage_updates",
        ["emergency_log_id"],
        unique=False,
    )
    op.create_index("ix_emergency_stage_updates_stage", "emergency_stage_updates", ["stage"], unique=False)
    op.create_index(
        "ix_emergency_stage_updates_updated_by_id",
        "emergency_stage_updates",
        ["updated_by_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_emergency_stage_updates_updated_by_id", table_name="emergency_stage_updates")
    op.drop_index("ix_emergency_stage_updates_stage", table_name="emergency_stage_updates")
    op.drop_index("ix_emergency_stage_updates_emergency_log_id", table_name="emergency_stage_updates")
    op.drop_table("emergency_stage_updates")

    op.drop_constraint("fk_emergency_logs_assigned_worker_id_users", "emergency_logs", type_="foreignkey")
    op.drop_index("ix_emergency_logs_current_stage", table_name="emergency_logs")
    op.drop_index("ix_emergency_logs_assigned_worker_id", table_name="emergency_logs")
    op.drop_column("emergency_logs", "current_stage")
    op.drop_column("emergency_logs", "assigned_worker_id")

    bind = op.get_bind()
    emergency_stage_enum.drop(bind, checkfirst=True)
