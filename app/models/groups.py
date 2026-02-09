from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Integer, String, Table, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from .courses import Course, CourseModule
    from .teachers import Teacher
    from .students import Student, StudentHomework


group_students = Table(
    "group_students",
    Base.metadata,
    Column("group_id", ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("student_id", ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
)


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_number: Mapped[str] = mapped_column(String(50), nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)

    course: Mapped["Course"] = relationship("Course", back_populates="groups")
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="groups")
    students: Mapped[list["Student"]] = relationship(
        "Student", secondary=group_students, back_populates="groups"
    )
    lessons: Mapped[list["GroupLesson"]] = relationship(
        "GroupLesson", back_populates="group", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("course_id", "group_number", name="uq_group_course_number"),)


class GroupLesson(Base):
    __tablename__ = "group_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_number: Mapped[int] = mapped_column(Integer, nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    material_links: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    module_id: Mapped[int | None] = mapped_column(
        ForeignKey("course_modules.id", ondelete="SET NULL"), nullable=True
    )
    homework_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    homework_file: Mapped[str | None] = mapped_column(String(255), nullable=True)

    group: Mapped["Group"] = relationship("Group", back_populates="lessons")
    module: Mapped["CourseModule"] = relationship("CourseModule")
    homeworks: Mapped[list["StudentHomework"]] = relationship(
        "StudentHomework", back_populates="group_lesson", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("group_id", "lesson_number", name="uq_group_lesson_number"),)
