from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from .organization import User
    from .groups import Group


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(primary_key=True)

    is_ovz: Mapped[bool] = mapped_column(default=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    @hybrid_property
    def age(self) -> int | None:
        if self.birth_date is None:
            return None
        today = datetime.now().date()
        bday = self.birth_date
        if today.month > bday.month or (today.month == bday.month and today.day >= bday.day):
            return today.year - bday.year
        return today.year - bday.year - 1

    groups: Mapped[list["Group"]] = relationship("Group", back_populates="teacher")

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    user: Mapped['User'] = relationship('User', back_populates="teacher")
