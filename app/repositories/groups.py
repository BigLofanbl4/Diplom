from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Course, Group, Student
from app.schemas import GroupCreate, GroupUpdate


class GroupRepository:
    def __init__(self, db: Session):
        self.db = db

    def _resolve_course_id(self, course_id: int | None) -> int | None:
        if course_id is None:
            return None
        db_course = self.db.get(Course, course_id)
        if not db_course:
            raise HTTPException(status_code=400, detail="Course not found")
        return db_course.id

    def get_group_by_id(self, group_id: int) -> Group | None:
        return self.db.query(Group).filter(Group.id == group_id).first()

    def get_groups(self, skip: int = 0, limit: int = 100) -> list[Group]:
        return self.db.query(Group).offset(skip).limit(limit).all()

    def get_group_by_number(self, group_number: str, course_id: int | None = None) -> Group | None:
        query = self.db.query(Group).filter(Group.group_number == str(group_number))
        if course_id is not None:
            query = query.filter(Group.course_id == course_id)
        return query.first()

    def create_group(self, group: GroupCreate) -> Group:
        resolved_course_id = self._resolve_course_id(group.course_id)
        db_group = Group(
            group_number=str(group.group_number),
            teacher_id=group.teacher_id,
            course_id=resolved_course_id,
        )

        if group.student_ids:
            students = self.db.query(Student).filter(Student.id.in_(group.student_ids)).all()
            db_group.students = students

        self.db.add(db_group)
        self.db.commit()
        self.db.refresh(db_group)
        return db_group

    def update_group(self, group_id: int, group_data: GroupUpdate) -> Group | None:
        db_group = self.get_group_by_id(group_id)
        if not db_group:
            return None

        update_data = group_data.model_dump(exclude_unset=True)

        if "course_id" in update_data:
            update_data["course_id"] = self._resolve_course_id(update_data["course_id"])

        for key, value in update_data.items():
            if key == "student_ids":
                continue
            if key == "group_number" and value is not None:
                value = str(value)
            setattr(db_group, key, value)

        if "student_ids" in update_data:
            ids = update_data["student_ids"]
            if ids:
                students = self.db.query(Student).filter(Student.id.in_(ids)).all()
                db_group.students = students
            else:
                db_group.students = []

        self.db.commit()
        self.db.refresh(db_group)
        return db_group

    def delete_group(self, group_id: int) -> bool:
        db_group = self.get_group_by_id(group_id)
        if not db_group:
            return False
        self.db.delete(db_group)
        self.db.commit()
        return True
