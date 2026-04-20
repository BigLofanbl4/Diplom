"""frontend contract backend

Revision ID: b7a2d0f7c9e1
Revises: 8fc43ceda67d
Create Date: 2026-04-20 20:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7a2d0f7c9e1"
down_revision: Union[str, Sequence[str], None] = "8fc43ceda67d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users", recreate="always") as batch_op:
        batch_op.alter_column(
            "role",
            existing_type=sa.Enum("admin", "teacher", "student", name="user_type_enum"),
            type_=sa.Enum("admin", "manager", "teacher", "student", name="user_type_enum"),
            existing_nullable=False,
        )

    with op.batch_alter_table("teachers") as batch_op:
        batch_op.add_column(sa.Column("course_ids", sa.JSON(), nullable=False, server_default="[]"))
        batch_op.add_column(sa.Column("schedule_preferences", sa.JSON(), nullable=False, server_default="[]"))
        batch_op.alter_column("course_ids", server_default=None)
        batch_op.alter_column("schedule_preferences", server_default=None)

    with op.batch_alter_table("groups") as batch_op:
        batch_op.add_column(sa.Column("planned_start_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("planned_end_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("planned_schedule_slots", sa.JSON(), nullable=False, server_default="[]"))
        batch_op.alter_column("planned_schedule_slots", server_default=None)

    with op.batch_alter_table("courses") as batch_op:
        batch_op.add_column(sa.Column("kind", sa.String(length=32), nullable=False, server_default="template"))
        batch_op.add_column(sa.Column("template_course_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("group_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("teacher_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("max_modules_count", sa.Integer(), nullable=False, server_default="0"))
        batch_op.create_foreign_key("fk_courses_template_course_id", "courses", ["template_course_id"], ["id"], ondelete="SET NULL")
        batch_op.create_foreign_key("fk_courses_group_id", "groups", ["group_id"], ["id"], ondelete="SET NULL")
        batch_op.create_foreign_key("fk_courses_teacher_id", "teachers", ["teacher_id"], ["id"], ondelete="SET NULL")
        batch_op.create_unique_constraint("uq_courses_group_id", ["group_id"])
        batch_op.alter_column("kind", server_default=None)
        batch_op.alter_column("max_modules_count", server_default=None)

    with op.batch_alter_table("questions") as batch_op:
        batch_op.add_column(sa.Column("number", sa.Integer(), nullable=False, server_default="1"))
        batch_op.alter_column("number", server_default=None)

    with op.batch_alter_table("course_lessons", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_course_lesson_number", type_="unique")
        batch_op.create_unique_constraint("uq_course_lesson_number", ["course_id", "module_id", "lesson_number"])

    op.create_table(
        "managers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "homework_submissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("files", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("checked_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["checked_by"], ["teachers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "lesson_id", "course_id", name="uq_homework_submission_student_lesson"),
    )

    op.create_table(
        "test_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("test_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("test_attempts")
    op.drop_table("homework_submissions")
    op.drop_table("managers")

    with op.batch_alter_table("course_lessons", recreate="always") as batch_op:
        batch_op.drop_constraint("uq_course_lesson_number", type_="unique")
        batch_op.create_unique_constraint("uq_course_lesson_number", ["course_id", "lesson_number"])

    with op.batch_alter_table("questions") as batch_op:
        batch_op.drop_column("number")

    with op.batch_alter_table("courses") as batch_op:
        batch_op.drop_constraint("uq_courses_group_id", type_="unique")
        batch_op.drop_constraint("fk_courses_teacher_id", type_="foreignkey")
        batch_op.drop_constraint("fk_courses_group_id", type_="foreignkey")
        batch_op.drop_constraint("fk_courses_template_course_id", type_="foreignkey")
        batch_op.drop_column("max_modules_count")
        batch_op.drop_column("teacher_id")
        batch_op.drop_column("group_id")
        batch_op.drop_column("template_course_id")
        batch_op.drop_column("kind")

    with op.batch_alter_table("groups") as batch_op:
        batch_op.drop_column("planned_schedule_slots")
        batch_op.drop_column("planned_end_date")
        batch_op.drop_column("planned_start_date")

    with op.batch_alter_table("teachers") as batch_op:
        batch_op.drop_column("schedule_preferences")
        batch_op.drop_column("course_ids")

    with op.batch_alter_table("users", recreate="always") as batch_op:
        batch_op.alter_column(
            "role",
            existing_type=sa.Enum("admin", "manager", "teacher", "student", name="user_type_enum"),
            type_=sa.Enum("admin", "teacher", "student", name="user_type_enum"),
            existing_nullable=False,
        )
