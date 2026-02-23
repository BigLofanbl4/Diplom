from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

import app.utils.security as security
from app.models import Group
from app.models.organization import Organization
from app.models.teachers import Teacher


class TeacherRepository:
    def __init__(self, db: Session):
        self.db = db

    def _resolve_organization_id(self, organization_id: int | None) -> int:
        if organization_id is not None:
            organization = self.db.get(Organization, organization_id)
            if organization is not None:
                return organization.id

        organization = self.db.query(Organization).first()
        if organization is not None:
            return organization.id

        organization = Organization(legal_address="Default organization")
        self.db.add(organization)
        self.db.commit()
        self.db.refresh(organization)
        return organization.id

    def create(
        self,
        login: str,
        password: str,
        organization_id: int | None,
        first_name: str,
        last_name: str,
        birth_date: date | None = None,
        phone: str | None = None,
        is_ovz: bool = False,
        group_ids: list[int] | None = None,
    ) -> Teacher:
        hashed_password = security.hash_password(password)
        teacher = Teacher(
            login=login,
            password_hash=hashed_password,
            organization_id=self._resolve_organization_id(organization_id),
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date,
            phone=phone,
            is_ovz=is_ovz,
        )
        if group_ids:
            teacher.groups = self.db.query(Group).filter(Group.id.in_(group_ids)).all()
        self.db.add(teacher)
        self.db.commit()
        self.db.refresh(teacher)
        return teacher

    def list(self, skip: int = 0, limit: int = 100) -> list[Teacher]:
        stmt = select(Teacher).offset(skip).limit(limit)
        return self.db.scalars(stmt).all()

    def delete(self, teacher_id: int) -> bool:
        teacher = self.db.get(Teacher, teacher_id)
        if teacher is None:
            return False
        self.db.delete(teacher)
        self.db.commit()
        return True

    def get_teacher(self, teacher_login: str = None, teacher_id: int = None):
        if teacher_id is not None:
            teacher = self.db.get(Teacher, teacher_id)
            if teacher is not None:
                return teacher
        elif teacher_login is not None:
            stmt = select(Teacher).where(Teacher.login == teacher_login)
            teacher = self.db.scalar(stmt)
            if teacher is not None:
                return teacher
        return None

    def verify_password(self, login: str, password: str):
        stmt = select(Teacher).where(Teacher.login == login)
        teacher = self.db.scalar(stmt)
        if teacher is None:
            return False
        if security.verify_password(password, teacher.password_hash):
            return teacher
        return False

    def update_teacher(
        self,
        teacher_id: int,
        login: str | None = None,
        password: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        birth_date: date | None = None,
        is_ovz: bool | None = None,
        phone: str | None = None,
        organization_id: int | None = None,
        group_ids: list[int] | None = None,
    ) -> Teacher | None:
        teacher = self.get_teacher(teacher_id=teacher_id)
        if teacher is None:
            return None

        if login is not None:
            teacher.login = login
        if first_name is not None:
            teacher.first_name = first_name
        if last_name is not None:
            teacher.last_name = last_name
        if birth_date is not None:
            teacher.birth_date = birth_date
        if is_ovz is not None:
            teacher.is_ovz = is_ovz
        if phone is not None:
            teacher.phone = phone
        if organization_id is not None:
            teacher.organization_id = self._resolve_organization_id(organization_id)
        if password:
            teacher.password_hash = security.hash_password(password)
        if group_ids is not None:
            if group_ids:
                teacher.groups = self.db.query(Group).filter(Group.id.in_(group_ids)).all()
            else:
                teacher.groups = []

        self.db.commit()
        self.db.refresh(teacher)
        return teacher

    def update_password(self, login: str, new_password: str):
        teacher = self.get_teacher(teacher_login=login)
        if teacher is None:
            return False
        teacher.password_hash = security.hash_password(new_password)
        self.db.commit()
        return True

    def all_groups(self, teacher_id: int):
        stmt = select(Teacher).where(Teacher.id == teacher_id).options(selectinload(Teacher.groups))
        teacher = self.db.scalar(stmt)
        if teacher is None:
            return []
        return teacher.groups
