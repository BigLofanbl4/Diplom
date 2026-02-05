from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    legal_address: Mapped[str] = mapped_column(String(255), nullable=False)
    payment_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    admins: Mapped[list["Admin"]] = relationship(
        "Admin", back_populates="organization", cascade="all, delete-orphan"
    )
    teachers: Mapped[list["Teacher"]] = relationship(
        "Teacher", back_populates="organization", cascade="all, delete-orphan"
    )


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )

    organization: Mapped["Organization"] = relationship("Organization", back_populates="admins")

    __table_args__ = (UniqueConstraint("organization_id", "login", name="uq_admin_login_org"),)
