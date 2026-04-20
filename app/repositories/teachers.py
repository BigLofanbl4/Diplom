from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

import app.utils.security as security
from app.models.groups import Group
from app.models.organization import User, UserType
from app.models.teachers import Teacher

from .base import BaseRepository
from .organization import UserRepository


class TeacherRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, organization_id: int | None = None) -> list[Teacher]:
        stmt = select(Teacher).options(
            selectinload(Teacher.user),
            selectinload(Teacher.groups),
        )
        if organization_id is not None:
            stmt = stmt.join(Teacher.user).where(User.organization_id == organization_id)
        return self.db.scalars(stmt).all()

    def get(self, teacher_id: int) -> Teacher | None:
        stmt = (
            select(Teacher)
            .where(Teacher.id == teacher_id)
            .options(
                selectinload(Teacher.user),
                selectinload(Teacher.groups),
            )
        )
        return self.db.scalar(stmt)

    def create(
        self,
        login: str,
        password: str,
        organization_id: int,
        first_name: str,
        last_name: str,
        birth_date: date | None = None,
        phone: str | None = None,
        is_ovz: bool = False,
        course_ids: Sequence[int] | None = None,
        schedule_preferences: list[dict] | None = None,
        group_ids: Sequence[int] | None = None,
    ) -> Teacher:
        user = UserRepository.make_user(
            login=login,
            password=password,
            organization_id=organization_id,
            role=UserType.teacher,
        )
        teacher = Teacher(
            user=user,
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date,
            phone=phone,
            is_ovz=is_ovz,
            course_ids=list(course_ids or []),
            schedule_preferences=list(schedule_preferences or []),
        )
        if group_ids is not None:
            teacher.groups = self._load_groups(group_ids)
        return self._save(teacher)

    def create_with_user(
        self,
        user_id: int,
        first_name: str,
        last_name: str,
        birth_date: date | None = None,
        phone: str | None = None,
        is_ovz: bool = False,
        course_ids: Sequence[int] | None = None,
        schedule_preferences: list[dict] | None = None,
        group_ids: Sequence[int] | None = None,
    ) -> Teacher:
        teacher = Teacher(
            user_id=user_id,
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date,
            phone=phone,
            is_ovz=is_ovz,
            course_ids=list(course_ids or []),
            schedule_preferences=list(schedule_preferences or []),
        )
        if group_ids is not None:
            teacher.groups = self._load_groups(group_ids)
        return self._save(teacher)

    def update(
        self,
        teacher_id: int,
        *,
        login: str | None = None,
        password: str | None = None,
        organization_id: int | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        birth_date: date | None = None,
        phone: str | None = None,
        phone_set: bool = False,
        is_ovz: bool | None = None,
        course_ids: Sequence[int] | None = None,
        course_ids_set: bool = False,
        schedule_preferences: list[dict] | None = None,
        schedule_preferences_set: bool = False,
        group_ids: Sequence[int] | None = None,
    ) -> Teacher | None:
        teacher = self.db.get(Teacher, teacher_id)
        if teacher is None:
            return None

        if first_name is not None:
            teacher.first_name = first_name
        if last_name is not None:
            teacher.last_name = last_name
        if birth_date is not None:
            teacher.birth_date = birth_date
        if phone_set:
            teacher.phone = phone
        if is_ovz is not None:
            teacher.is_ovz = is_ovz
        if course_ids_set:
            teacher.course_ids = list(course_ids or [])
        if schedule_preferences_set:
            teacher.schedule_preferences = list(schedule_preferences or [])

        if group_ids is not None:
            teacher.groups = self._load_groups(group_ids)

        if teacher.user is not None:
            if login is not None:
                teacher.user.login = login
            if password is not None:
                teacher.user.password_hash = security.hash_password(password)
            if organization_id is not None:
                teacher.user.organization_id = organization_id

        self.db.commit()
        self.db.refresh(teacher)
        return teacher

    def delete(self, teacher_id: int) -> bool:
        teacher = self.db.get(Teacher, teacher_id)
        if teacher is None:
            return False

        user = teacher.user
        self.db.delete(teacher)
        if user is not None:
            self.db.delete(user)
        self.db.commit()
        return True

    def all_groups(self, teacher_id: int) -> list[Group]:
        teacher = self.get(teacher_id)
        if teacher is None:
            return []
        return teacher.groups

    def _load_groups(self, group_ids: Sequence[int]) -> list[Group]:
        unique_ids = list(dict.fromkeys(group_ids))
        if not unique_ids:
            return []

        stmt = select(Group).where(Group.id.in_(unique_ids))
        groups = self.db.scalars(stmt).all()
        groups_by_id = {group.id: group for group in groups}
        return [groups_by_id[group_id] for group_id in unique_ids if group_id in groups_by_id]
