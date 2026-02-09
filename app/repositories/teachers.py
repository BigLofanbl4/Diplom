from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

import app.utils.security as security
from app.models.teachers import Teacher


class TeacherRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, login: str, password: str,
               organization_id: int, first_name: str,
               last_name: str, birth_date: date | None = None, phone: str | None = None):
        hashed_password = security.hash_password(password)
        teacher = Teacher(
            login=login,
            password_hash=hashed_password,
            organization_id=organization_id,
            first_name=first_name,
            last_name=last_name,
            birth_date=birth_date,
            phone=phone
        )
        self.db.add(teacher)
        self.db.commit()

    def delete(self, teacher_id: int):
        teacher = self.db.get(Teacher, teacher_id)
        self.db.delete(teacher)
        self.db.commit()

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

    def update_password(self, login: str, new_password: str):
        pass

    def all_groups(self, teacher_id: int):
        stmt = select(Teacher).where(Teacher.id == teacher_id).options(selectinload(Teacher.groups))
        teacher = self.db.scalar(stmt)
        if teacher is None:
            return []
        return teacher.groups
