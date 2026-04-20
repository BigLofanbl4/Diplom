from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.organization import User
from ..models.students import Student
from ..repositories import GroupRepository, StudentRepository
from ..schemas import GroupRef
from ..utils.api_errors import not_found
from .auth import get_current_user

router = APIRouter(prefix='/students', tags=['students'])


class StudentCreateRequest(BaseModel):
    first_name: str
    last_name: str
    login: str
    password: str
    phone: str | None = None
    birth_date: date | None = None
    group_ids: list[int] = Field(default_factory=list)


class StudentUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    login: str | None = None
    password: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    group_ids: list[int] | None = None


class StudentListItem(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str | None = None
    birth_date: date | None = None
    login: str
    groups_count: int
    model_config = ConfigDict(from_attributes=True)


class StudentsListResponse(BaseModel):
    data: list[StudentListItem]


class StudentDetail(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str | None = None
    birth_date: date | None = None
    login: str
    group_ids: list[int]
    groups: list[GroupRef]
    model_config = ConfigDict(from_attributes=True)


def _get_scoped_student_or_404(repo: StudentRepository, student_id: int, user: User) -> Student:
    student = repo.get(student_id)
    if student is None or student.user is None or student.user.organization_id != user.organization_id:
        raise not_found("Student not found")
    return student


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


def _validate_group_ids(db: Session, group_ids: list[int] | None, organization_id: int) -> None:
    if group_ids is None:
        return
    repo = GroupRepository(db)
    for group_id in group_ids:
        group = repo.get(group_id)
        if group is None or group.organization_id != organization_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")


@router.get('', response_model=StudentsListResponse)
def list_students(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> StudentsListResponse:
    students = StudentRepository(db).list(organization_id=current_user.organization_id)
    return StudentsListResponse(data=[_to_list_item(student) for student in students])


@router.get('/{student_id}', response_model=StudentDetail)
def get_student(
        student_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> StudentDetail:
    student = _get_scoped_student_or_404(StudentRepository(db), student_id, current_user)
    return _to_detail(student)


@router.post('', response_model=StudentDetail, status_code=status.HTTP_201_CREATED)
def create_student(
        data: StudentCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> StudentDetail:
    _validate_group_ids(db, data.group_ids, current_user.organization_id)
    repo = StudentRepository(db)
    try:
        student = repo.create(
            login=data.login,
            password=data.password,
            organization_id=current_user.organization_id,
            first_name=data.first_name,
            last_name=data.last_name,
            parent_phone=data.phone,
            birth_date=data.birth_date,
            group_ids=data.group_ids,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    reloaded = repo.get(student.id)
    if reloaded is None:
        raise not_found("Student not found")
    return _to_detail(reloaded)


@router.patch('/{student_id}', response_model=StudentDetail)
def update_student(
        student_id: int,
        data: StudentUpdateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> StudentDetail:
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

    repo = StudentRepository(db)
    _get_scoped_student_or_404(repo, student_id, current_user)
    _validate_group_ids(db, payload.get("group_ids"), current_user.organization_id)

    try:
        student = repo.update(
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
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    if student is None:
        raise not_found("Student not found")
    return _to_detail(student)


@router.delete('/{student_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
        student_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    repo = StudentRepository(db)
    _get_scoped_student_or_404(repo, student_id, current_user)
    repo.delete(student_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
