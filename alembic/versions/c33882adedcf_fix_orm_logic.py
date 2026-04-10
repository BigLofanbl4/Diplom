"""fix orm logic

Revision ID: c33882adedcf
Revises: 151ac8841d4a
Create Date: 2026-04-10 22:36:35.713670

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c33882adedcf'
down_revision: Union[str, Sequence[str], None] = '151ac8841d4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("admins") as batch_op:
        batch_op.add_column(
            sa.Column("first_name", sa.String(length=100), nullable=False, server_default="")
        )
        batch_op.add_column(
            sa.Column("last_name", sa.String(length=100), nullable=False, server_default="")
        )
        batch_op.alter_column("first_name", server_default=None)
        batch_op.alter_column("last_name", server_default=None)

    with op.batch_alter_table("group_courses") as batch_op:
        batch_op.create_unique_constraint("uq_group_courses_group_id", ["group_id"])

    with op.batch_alter_table("groups", recreate="always") as batch_op:
        batch_op.drop_column("custom_course_id")

    with op.batch_alter_table("tests") as batch_op:
        batch_op.create_unique_constraint("uq_tests_lesson_id", ["lesson_id"])

    with op.batch_alter_table("users") as batch_op:
        batch_op.create_unique_constraint("uq_users_login", ["login"])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_login", type_="unique")

    with op.batch_alter_table("tests") as batch_op:
        batch_op.drop_constraint("uq_tests_lesson_id", type_="unique")

    with op.batch_alter_table("groups", recreate="always") as batch_op:
        batch_op.add_column(sa.Column("custom_course_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_groups_custom_course_id_group_courses",
            "group_courses",
            ["custom_course_id"],
            ["id"],
            ondelete="SET NULL",
        )

    with op.batch_alter_table("group_courses") as batch_op:
        batch_op.drop_constraint("uq_group_courses_group_id", type_="unique")

    with op.batch_alter_table("admins") as batch_op:
        batch_op.drop_column("last_name")
        batch_op.drop_column("first_name")
