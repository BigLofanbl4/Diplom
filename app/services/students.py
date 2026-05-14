from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.organization import User
from app.models.students import Student
from app.repositories import GroupRepository, StudentRepository
from app.schemas import GroupRef
from app.schemas.students import (
    StudentCreateRequest,
    StudentDetail,
    StudentListItem,
    StudentsListResponse,
    StudentUpdateRequest,
)
from app.utils.api_errors import not_found


class StudentAdminService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
        self.repo = StudentRepository(db)

    def list_students(self) -> StudentsListResponse:
        students = self.repo.list(organization_id=self.current_user.organization_id)
        return StudentsListResponse(data=[self._to_list_item(student) for student in students])

    def get_student(self, student_id: int) -> StudentDetail:
        return self._to_detail(self._scoped_student_or_404(student_id))

    def create_student(self, data: StudentCreateRequest) -> StudentDetail:
        self._validate_group_ids(data.group_ids)
        try:
            student = self.repo.create(
                login=data.login,
                password=data.password,
                organization_id=self.current_user.organization_id,
                first_name=data.first_name,
                last_name=data.last_name,
                parent_phone=data.phone,
                birth_date=data.birth_date,
                group_ids=data.group_ids,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        reloaded = self.repo.get(student.id)
        if reloaded is None:
            raise not_found("Student not found")
        return self._to_detail(reloaded)

    def update_student(self, student_id: int, data: StudentUpdateRequest) -> StudentDetail:
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

        self._scoped_student_or_404(student_id)
        self._validate_group_ids(payload.get("group_ids"))
        try:
            student = self.repo.update(
                student_id,
                login=payload.get("login"),
                password=payload.get("password"),
                first_name=payload.get("first_name"),
                last_name=payload.get("last_name"),
                parent_phone=payload.get("phone"),
                birth_date=payload.get("birth_date"),
                group_ids=payload.get("group_ids"),
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        if student is None:
            raise not_found("Student not found")
        return self._to_detail(student)

    def delete_student(self, student_id: int) -> None:
        self._scoped_student_or_404(student_id)
        self.repo.delete(student_id)

    def _scoped_student_or_404(self, student_id: int) -> Student:
        student = self.repo.get(student_id)
        if (
            student is None
            or student.user is None
            or student.user.organization_id != self.current_user.organization_id
        ):
            raise not_found("Student not found")
        return student

    def _validate_group_ids(self, group_ids: list[int] | None) -> None:
        if group_ids is None:
            return
        repo = GroupRepository(self.db)
        for group_id in group_ids:
            group = repo.get(group_id)
            if group is None or group.organization_id != self.current_user.organization_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    @staticmethod
    def _to_list_item(student: Student) -> StudentListItem:
        return StudentListItem(
            id=student.id,
            first_name=student.first_name,
            last_name=student.last_name,
            phone=student.parent_phone,
            birth_date=student.birth_date,
            login=student.user.login if student.user is not None else "",
            groups_count=len(student.groups),
        )

    @staticmethod
    def _to_detail(student: Student) -> StudentDetail:
        groups = [GroupRef.model_validate(group) for group in student.groups]
        return StudentDetail(
            id=student.id,
            first_name=student.first_name,
            last_name=student.last_name,
            phone=student.parent_phone,
            birth_date=student.birth_date,
            login=student.user.login if student.user is not None else "",
            group_ids=[group.id for group in student.groups],
            groups=groups,
        )
