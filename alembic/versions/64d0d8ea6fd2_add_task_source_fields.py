"""add task source fields

Revision ID: 64d0d8ea6fd2
Revises: d1e8f6a7b3c2
Create Date: 2026-05-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "64d0d8ea6fd2"
down_revision = "d1e8f6a7b3c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("source", sa.String(length=64), nullable=True))
    op.add_column("tasks", sa.Column("source_key", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "source_key")
    op.drop_column("tasks", "source")
