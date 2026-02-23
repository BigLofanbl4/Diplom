from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Group, Student
from app.schemas import StudentCreate, StudentUpdate


class StudentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_student_by_id(self, student_id: int) -> Student | None:
        return self.db.query(Student).filter(Student.id == student_id).first()

    def get_students(self, skip: int = 0, limit: int = 100) -> list[Student]:
        return self.db.query(Student).offset(skip).limit(limit).all()

    def create_student(self, student: StudentCreate) -> Student:
        db_student = Student(
            first_name=student.first_name,
            last_name=student.last_name,
            parent_phone=student.parent_phone,
            birth_date=student.birth_date,
        )

        if student.group_ids:
            db_groups = self.db.query(Group).filter(Group.id.in_(student.group_ids)).all()
            db_student.groups = db_groups

        self.db.add(db_student)
        self.db.commit()
        self.db.refresh(db_student)
        return db_student

    def update_student(self, student_id: int, student_data: StudentUpdate) -> Student | None:
        db_student = self.get_student_by_id(student_id)
        if not db_student:
            return None

        update_data = student_data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if key == "group_ids":
                continue
            setattr(db_student, key, value)

        if "group_ids" in update_data:
            ids = update_data["group_ids"]
            if ids:
                db_groups = self.db.query(Group).filter(Group.id.in_(ids)).all()
                db_student.groups = db_groups
            else:
                db_student.groups = []

        self.db.commit()
        self.db.refresh(db_student)
        return db_student

    def delete_student(self, student_id: int) -> bool:
        db_student = self.get_student_by_id(student_id)
        if not db_student:
            return False
        self.db.delete(db_student)
        self.db.commit()
        return True
