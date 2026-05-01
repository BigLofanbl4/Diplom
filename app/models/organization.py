from __future__ import annotations

import enum
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from .managers import Manager
    from .teachers import Teacher
    from .courses import Course
    from .groups import Group
    from .students import Student
    from .tasks import Task


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    legal_address: Mapped[str] = mapped_column(String(255), nullable=False)
    payment_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    users: Mapped[list["User"]] = relationship(
        "User", back_populates="organization", cascade="all, delete-orphan"
    )

    courses: Mapped[list["Course"]] = relationship("Course", back_populates="organization")
    groups: Mapped[list["Group"]] = relationship('Group', back_populates="organization",
                                                 cascade="all, delete-orphan")


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    user: Mapped['User'] = relationship('User', back_populates="admin")


class UserType(enum.Enum):
    admin = 'admin'
    manager = 'manager'
    teacher = 'teacher'
    student = 'student'


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserType] = mapped_column(Enum(UserType, name='user_type_enum'), nullable=False)

    admin: Mapped["Admin"] = relationship('Admin', back_populates="user", uselist=False)
    manager: Mapped["Manager"] = relationship('Manager', back_populates="user", uselist=False)
    teacher: Mapped["Teacher"] = relationship('Teacher', back_populates="user", uselist=False)
    student: Mapped["Student"] = relationship('Student', back_populates="user", uselist=False)
    created_tasks: Mapped[list["Task"]] = relationship(
        "Task",
        foreign_keys="Task.creator_user_id",
        back_populates="creator",
    )
    assigned_tasks: Mapped[list["Task"]] = relationship(
        "Task",
        foreign_keys="Task.assignee_user_id",
        back_populates="assignee",
    )

    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    organization = relationship("Organization", back_populates="users")
