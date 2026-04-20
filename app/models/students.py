from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, Date
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from .groups import group_students

if TYPE_CHECKING:
    from .groups import Group, GroupLesson
    from .organization import User


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    groups: Mapped[list["Group"]] = relationship(
        "Group", secondary=group_students, back_populates="students"
    )
    homeworks: Mapped[list["StudentHomework"]] = relationship(
        "StudentHomework", back_populates="student", cascade="all, delete-orphan"
    )

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    user: Mapped['User'] = relationship('User', back_populates="student")

    @hybrid_property
    def age(self) -> int | None:
        if self.birth_date is None:
            return None
        today = datetime.now().date()
        bday = self.birth_date
        if today.month > bday.month or (today.month == bday.month and today.day >= bday.day):
            return today.year - bday.year
        return today.year - bday.year - 1


class StudentHomework(Base):
    __tablename__ = "student_homeworks"

    id: Mapped[int] = mapped_column(primary_key=True)
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    group_lesson_id: Mapped[int] = mapped_column(
        ForeignKey("group_lessons.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    teacher_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    student: Mapped["Student"] = relationship("Student", back_populates="homeworks")
    group_lesson: Mapped["GroupLesson"] = relationship("GroupLesson", back_populates="homeworks")

    __table_args__ = (
        UniqueConstraint("group_lesson_id", "student_id", name="uq_homework_per_student_lesson"),
    )
