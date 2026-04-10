"""groups course nullable

Revision ID: 0952b8490745
Revises: c33882adedcf
Create Date: 2026-04-10 23:21:30.321717

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0952b8490745'
down_revision: Union[str, Sequence[str], None] = 'c33882adedcf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        null_rows = bind.execute(
            sa.text("SELECT COUNT(*) FROM groups WHERE template_course_id IS NULL")
        ).scalar_one()
        if null_rows > 0:
            raise RuntimeError(
                "Cannot downgrade: groups.template_course_id contains NULL values."
            )
        op.execute(
            """
            CREATE TABLE groups__tmp (
                id INTEGER NOT NULL,
                group_number VARCHAR(50) NOT NULL,
                template_course_id INTEGER NULL,
                organization_id INTEGER NOT NULL,
                teacher_id INTEGER NULL,
                PRIMARY KEY (id),
                FOREIGN KEY(template_course_id) REFERENCES courses (id) ON DELETE SET NULL,
                FOREIGN KEY(organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
                FOREIGN KEY(teacher_id) REFERENCES teachers (id) ON DELETE SET NULL
            )
            """
        )
        op.execute(
            """
            INSERT INTO groups__tmp (id, group_number, template_course_id, organization_id, teacher_id)
            SELECT id, group_number, template_course_id, organization_id, teacher_id
            FROM groups
            """
        )
        op.execute("DROP TABLE groups")
        op.execute("ALTER TABLE groups__tmp RENAME TO groups")
    else:
        op.alter_column(
            "groups",
            "template_course_id",
            existing_type=sa.INTEGER(),
            nullable=True,
        )
        op.drop_constraint("groups_template_course_id_fkey", "groups", type_="foreignkey")
        op.create_foreign_key(
            "groups_template_course_id_fkey",
            "groups",
            "courses",
            ["template_course_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        op.execute(
            """
            CREATE TABLE groups__tmp (
                id INTEGER NOT NULL,
                group_number VARCHAR(50) NOT NULL,
                template_course_id INTEGER NOT NULL,
                organization_id INTEGER NOT NULL,
                teacher_id INTEGER NULL,
                PRIMARY KEY (id),
                FOREIGN KEY(template_course_id) REFERENCES courses (id),
                FOREIGN KEY(organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
                FOREIGN KEY(teacher_id) REFERENCES teachers (id) ON DELETE SET NULL
            )
            """
        )
        op.execute(
            """
            INSERT INTO groups__tmp (id, group_number, template_course_id, organization_id, teacher_id)
            SELECT id, group_number, template_course_id, organization_id, teacher_id
            FROM groups
            """
        )
        op.execute("DROP TABLE groups")
        op.execute("ALTER TABLE groups__tmp RENAME TO groups")
    else:
        op.drop_constraint("groups_template_course_id_fkey", "groups", type_="foreignkey")
        op.create_foreign_key(
            "groups_template_course_id_fkey",
            "groups",
            "courses",
            ["template_course_id"],
            ["id"],
        )
        op.alter_column(
            "groups",
            "template_course_id",
            existing_type=sa.INTEGER(),
            nullable=False,
        )
