"""allow groups without course

Revision ID: 4f3b2c1d9e7a
Revises: aa57259d02ce
Create Date: 2026-02-23 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4f3b2c1d9e7a"
down_revision: Union[str, Sequence[str], None] = "aa57259d02ce"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("groups") as batch_op:
        batch_op.alter_column("course_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("groups") as batch_op:
        batch_op.alter_column("course_id", existing_type=sa.Integer(), nullable=False)
