from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from .groups import Group


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    modules: Mapped[list["CourseModule"]] = relationship(
        "CourseModule", back_populates="course", cascade="all, delete-orphan"
    )
    lessons: Mapped[list["CourseLesson"]] = relationship(
        "CourseLesson", back_populates="course", cascade="all, delete-orphan"
    )
    materials: Mapped[list["CourseMaterial"]] = relationship(
        "CourseMaterial", back_populates="course", cascade="all, delete-orphan"
    )
    groups: Mapped[list["Group"]] = relationship("Group", back_populates="course")


class CourseModule(Base):
    __tablename__ = "course_modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    module_number: Mapped[int] = mapped_column(Integer, nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    lessons: Mapped[list["CourseLesson"]] = relationship(
        "CourseLesson", back_populates="module", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("course_id", "module_number", name="uq_course_module_number"),)


class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    lesson_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    module_id: Mapped[int | None] = mapped_column(
        ForeignKey("course_modules.id", ondelete="SET NULL"), nullable=True
    )

    course: Mapped["Course"] = relationship("Course", back_populates="lessons")
    module: Mapped["CourseModule"] = relationship("CourseModule", back_populates="lessons")
    materials: Mapped[list["CourseMaterial"]] = relationship(
        "CourseMaterial", back_populates="lesson", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("course_id", "lesson_number", name="uq_course_lesson_number"),)


class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    homework_file: Mapped[str | None] = mapped_column(String(255), nullable=True)
    homework_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("course_lessons.id", ondelete="CASCADE"), nullable=False)

    files: Mapped[list["File"]] = relationship("File", back_populates='material', cascade="all, delete-orphan")
    course: Mapped["Course"] = relationship("Course", back_populates="materials")
    lesson: Mapped["CourseLesson"] = relationship("CourseLesson", back_populates="materials")


class File(Base):
    __tablename__ = "files"
    id: Mapped[int] = mapped_column(primary_key=True)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    material_id: Mapped[int] = mapped_column(ForeignKey("course_materials.id", ondelete="CASCADE"), nullable=False)

    material: Mapped["CourseMaterial"] = relationship("CourseMaterial", back_populates="files")

