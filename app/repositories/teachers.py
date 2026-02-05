from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from app.models.teachers import Teacher
import app.utils.security as security


class TeacherRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, login: str, password: str,
               organization_id: int, first_name: str,
               last_name: str, age: int, phone: str=None):
        hashed_password = security.hash_password(password)
        teacher = Teacher(
            login=login,
            password_hash=hashed_password,
            organization_id=organization_id,
            first_name=first_name,
            last_name=last_name,
            age=age,
            phone=phone
        )
        self.db.add(teacher)
        self.db.commit()

    def delete(self, teacher_id: int):
        teacher = self.db.get(Teacher, teacher_id)
        self.db.delete(teacher)
        self.db.commit()


    def list(self):
        stmt = select(Teacher)
        admins = self.db.scalars(stmt).all()
        return admins

    def verify_password(self, login: str, password: str):
        stmt = select(Teacher).where(Teacher.login == login)
        admin = self.db.scalar(stmt)
        return security.verify_password(password, admin.password_hash)

    def update_password(self, login: str, new_password: str):
        pass

    def all_groups(self, teacher_id: int):
        stmt = select(Teacher).where(Teacher.id == teacher_id).options(selectinload(Teacher.groups))
        teacher = self.db.scalar(stmt)
        if teacher is None:
            return []
        return teacher.groups
