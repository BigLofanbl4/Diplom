from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

import app.utils.security as security
from app.models.groups import Group
from app.models.organization import User, UserType
from app.models.students import Student, StudentHomework

from .base import BaseRepository
from .organization import UserRepository


class StudentRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, organization_id: int | None = None) -> list[Student]:
        stmt = select(Student).options(
            selectinload(Student.user),
            selectinload(Student.groups),
            selectinload(Student.homeworks),
        )
        if organization_id is not None:
            stmt = stmt.join(Student.user).where(User.organization_id == organization_id)
        return self.db.scalars(stmt).all()

    def get(self, student_id: int) -> Student | None:
        stmt = (
            select(Student)
            .where(Student.id == student_id)
            .options(
                selectinload(Student.user),
                selectinload(Student.groups),
                selectinload(Student.homeworks),
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
        parent_phone: str | None = None,
        birth_date: date | None = None,
        group_ids: Sequence[int] | None = None,
    ) -> Student:
        user = UserRepository.make_user(
            login=login,
            password=password,
            organization_id=organization_id,
            role=UserType.student,
        )
        student = Student(
            user=user,
            first_name=first_name,
            last_name=last_name,
            parent_phone=parent_phone,
            birth_date=birth_date,
        )
        if group_ids is not None:
            student.groups = self._load_groups(group_ids)
        return self._save(student)

    def create_with_user(
        self,
        user_id: int,
        first_name: str,
        last_name: str,
        parent_phone: str | None = None,
        birth_date: date | None = None,
        group_ids: Sequence[int] | None = None,
    ) -> Student:
        student = Student(
            user_id=user_id,
            first_name=first_name,
            last_name=last_name,
            parent_phone=parent_phone,
            birth_date=birth_date,
        )
        if group_ids is not None:
            student.groups = self._load_groups(group_ids)
        return self._save(student)

    def update(
        self,
        student_id: int,
        *,
        login: str | None = None,
        password: str | None = None,
        organization_id: int | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        parent_phone: str | None = None,
        birth_date: date | None = None,
        group_ids: Sequence[int] | None = None,
    ) -> Student | None:
        student = self.db.get(Student, student_id)
        if student is None:
            return None

        if first_name is not None:
            student.first_name = first_name
        if last_name is not None:
            student.last_name = last_name
        if parent_phone is not None:
            student.parent_phone = parent_phone
        if birth_date is not None:
            student.birth_date = birth_date

        if group_ids is not None:
            student.groups = self._load_groups(group_ids)

        if student.user is not None:
            if login is not None:
                student.user.login = login
            if password is not None:
                student.user.password_hash = security.hash_password(password)
            if organization_id is not None:
                student.user.organization_id = organization_id

        self.db.commit()
        self.db.refresh(student)
        return student

    def delete(self, student_id: int) -> bool:
        student = self.db.get(Student, student_id)
        if student is None:
            return False

        user = student.user
        self.db.delete(student)
        if user is not None:
            self.db.delete(user)
        self.db.commit()
        return True

    def _load_groups(self, group_ids: Sequence[int]) -> list[Group]:
        unique_ids = list(dict.fromkeys(group_ids))
        if not unique_ids:
            return []

        stmt = select(Group).where(Group.id.in_(unique_ids))
        groups = self.db.scalars(stmt).all()
        groups_by_id = {group.id: group for group in groups}
        return [groups_by_id[group_id] for group_id in unique_ids if group_id in groups_by_id]


class StudentHomeworkRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(
        self,
        *,
        student_id: int | None = None,
        group_lesson_id: int | None = None,
    ) -> list[StudentHomework]:
        stmt = select(StudentHomework).options(
            selectinload(StudentHomework.student),
            selectinload(StudentHomework.group_lesson),
        )
        if student_id is not None:
            stmt = stmt.where(StudentHomework.student_id == student_id)
        if group_lesson_id is not None:
            stmt = stmt.where(StudentHomework.group_lesson_id == group_lesson_id)
        return self.db.scalars(stmt).all()

    def get(self, homework_id: int) -> StudentHomework | None:
        stmt = (
            select(StudentHomework)
            .where(StudentHomework.id == homework_id)
            .options(
                selectinload(StudentHomework.student),
                selectinload(StudentHomework.group_lesson),
            )
        )
        return self.db.scalar(stmt)

    def create(
        self,
        *,
        answer: str | None,
        group_lesson_id: int,
        student_id: int,
        grade: int | None = None,
        teacher_comment: str | None = None,
    ) -> StudentHomework:
        homework = StudentHomework(
            answer=answer,
            group_lesson_id=group_lesson_id,
            student_id=student_id,
            grade=grade,
            teacher_comment=teacher_comment,
        )
        return self._save(homework)

    def update(
        self,
        homework_id: int,
        *,
        answer: str | None = None,
        group_lesson_id: int | None = None,
        student_id: int | None = None,
        grade: int | None = None,
        teacher_comment: str | None = None,
    ) -> StudentHomework | None:
        homework = self.db.get(StudentHomework, homework_id)
        if homework is None:
            return None

        if answer is not None:
            homework.answer = answer
        if group_lesson_id is not None:
            homework.group_lesson_id = group_lesson_id
        if student_id is not None:
            homework.student_id = student_id
        if grade is not None:
            homework.grade = grade
        if teacher_comment is not None:
            homework.teacher_comment = teacher_comment

        self.db.commit()
        self.db.refresh(homework)
        return homework

    def delete(self, homework_id: int) -> bool:
        homework = self.db.get(StudentHomework, homework_id)
        if homework is None:
            return False
        self.db.delete(homework)
        self.db.commit()
        return True

    def list_by_lesson(self, group_lesson_id: int) -> list[StudentHomework]:
        return self.list(group_lesson_id=group_lesson_id)

    def list_by_student(self, student_id: int) -> list[StudentHomework]:
        return self.list(student_id=student_id)
