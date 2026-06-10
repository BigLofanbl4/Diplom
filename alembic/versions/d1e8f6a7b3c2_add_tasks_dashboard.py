"""add tasks dashboard

Revision ID: d1e8f6a7b3c2
Revises: 208289511f63
Create Date: 2026-05-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1e8f6a7b3c2"
down_revision: Union[str, Sequence[str], None] = "208289511f63"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("creator_user_id", sa.Integer(), nullable=False),
        sa.Column("assignee_user_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["assignee_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["creator_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_organization_id", "tasks", ["organization_id"], unique=False)
    op.create_index("ix_tasks_assignee_user_id", "tasks", ["assignee_user_id"], unique=False)
    op.create_index("ix_tasks_status", "tasks", ["status"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_tasks_status", table_name="tasks")
    op.drop_index("ix_tasks_assignee_user_id", table_name="tasks")
    op.drop_index("ix_tasks_organization_id", table_name="tasks")
    op.drop_table("tasks")
