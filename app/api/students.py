from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.organization import User
from ..schemas.students import (
    StudentCreateRequest,
    StudentDetail,
    StudentsListResponse,
    StudentUpdateRequest,
)
from ..services.students import StudentAdminService
from .auth import get_current_user

router = APIRouter(prefix='/students', tags=['students'])


def _service(db: Session, current_user: User) -> StudentAdminService:
    return StudentAdminService(db, current_user)


@router.get('', response_model=StudentsListResponse)
def list_students(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> StudentsListResponse:
    return _service(db, current_user).list_students()


@router.get('/{student_id}', response_model=StudentDetail)
def get_student(
        student_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> StudentDetail:
    return _service(db, current_user).get_student(student_id)


@router.post('', response_model=StudentDetail, status_code=status.HTTP_201_CREATED)
def create_student(
        data: StudentCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> StudentDetail:
    return _service(db, current_user).create_student(data)


@router.patch('/{student_id}', response_model=StudentDetail)
def update_student(
        student_id: int,
        data: StudentUpdateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> StudentDetail:
    return _service(db, current_user).update_student(student_id, data)


@router.delete('/{student_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
        student_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _service(db, current_user).delete_student(student_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
