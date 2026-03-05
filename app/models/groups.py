from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Integer, String, Table, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from .courses import Course
    from .teachers import Teacher
    from .students import Student, StudentHomework
    from .organization import Organization

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
    template_course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="NO ACTION"), nullable=False)
    custom_course_id: Mapped[int | None] = mapped_column(ForeignKey("group_courses.id", ondelete="SET NULL"),
                                                         nullable=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)

    template_course: Mapped["Course"] = relationship("Course", foreign_keys=[template_course_id],
                                                     back_populates="groups")
    custom_course: Mapped["GroupCourse | None"] = relationship(
        "GroupCourse",
        foreign_keys=[custom_course_id],
    )

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="groups")
    students: Mapped[list["Student"]] = relationship(
        "Student", secondary=group_students, back_populates="groups"
    )
    lessons: Mapped[list["GroupLesson"]] = relationship(
        "GroupLesson", back_populates="group", cascade="all, delete-orphan"
    )
    organization: Mapped["Organization"] = relationship("Organization", back_populates="groups")


class GroupCourse(Base):
    __tablename__ = "group_courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)

    organization: Mapped["Organization"] = relationship('Organization')
    modules: Mapped[list["GroupModule"]] = relationship(
        'GroupModule', back_populates="course", cascade="all, delete-orphan")
    lessons: Mapped[list["GroupLesson"]] = relationship('GroupLesson', back_populates="course",
                                                        cascade="all, delete-orphan")


class GroupModule(Base):
    __tablename__ = "group_modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    module_number: Mapped[int] = mapped_column(nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("group_courses.id", ondelete="CASCADE"), nullable=False)

    course: Mapped['GroupCourse'] = relationship("GroupCourse", back_populates="modules")
    lessons: Mapped[list["GroupLesson"]] = relationship('GroupLesson', back_populates="module",
                                                        cascade="all, delete-orphan")


class GroupLesson(Base):
    __tablename__ = "group_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_number: Mapped[int] = mapped_column(Integer, nullable=False)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    material_links: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    module_id: Mapped[int | None] = mapped_column(
        ForeignKey("group_modules.id", ondelete="SET NULL"), nullable=True
    )
    homework_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    homework_file: Mapped[str | None] = mapped_column(String(255), nullable=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("group_courses.id", ondelete="CASCADE"), nullable=False)

    course: Mapped["GroupCourse"] = relationship("GroupCourse", back_populates="lessons")
    group: Mapped["Group"] = relationship("Group", back_populates="lessons")
    module: Mapped["GroupModule"] = relationship("GroupModule", back_populates="lessons")
    homeworks: Mapped[list["StudentHomework"]] = relationship(
        "StudentHomework", back_populates="group_lesson", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("group_id", "module_id", "lesson_number", name="uq_group_module_lesson_number"),)

# class GroupTest(Base):
#     __tablename__ = "tests"
#
#     id: Mapped[int] = mapped_column(primary_key=True)
#     title: Mapped[str] = mapped_column(String(255), nullable=False)
#     course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
#     lesson_id: Mapped[int] = mapped_column(ForeignKey("course_lessons.id", ondelete="CASCADE"), nullable=False)
#
#     course: Mapped["Course"] = relationship("Course")
#     lesson: Mapped["CourseLesson"] = relationship("CourseLesson", back_populates="test")
#
#     questions: Mapped[list['Question']] = relationship("Question", back_populates="test")
#
#
# class Question(Base):
#     __tablename__ = "questions"
#
#     id: Mapped[int] = mapped_column(primary_key=True)
#     front_id: Mapped[int] = mapped_column(String(50), nullable=False)
#
#     test_id: Mapped[int] = mapped_column(ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
#     type_id: Mapped[int] = mapped_column(ForeignKey("question_types.id", ondelete="NO ACTION"), nullable=False)
#
#     type: Mapped["QuestionType"] = relationship("QuestionType")
#     test: Mapped["Test"] = relationship("Test", back_populates="questions")
#
#
# class QuestionType(Base):
#     __tablename__ = "question_types"
#     id: Mapped[int] = mapped_column(primary_key=True)
#     type: Mapped[str] = mapped_column(String(30), nullable=False)
