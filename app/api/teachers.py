from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.organization import User
from ..schemas.teachers import (
    TeacherCreateRequest,
    TeacherDetail,
    TeachersListResponse,
    TeacherUpdateRequest,
)
from ..services.teachers import TeacherAdminService
from .auth import get_current_user

router = APIRouter(prefix='/teachers', tags=['teachers'])


def _service(db: Session, current_user: User) -> TeacherAdminService:
    return TeacherAdminService(db, current_user)


@router.get('', response_model=TeachersListResponse)
def list_teachers(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        limit: Annotated[int, Query(ge=1, le=200)] = 50,
        offset: Annotated[int, Query(ge=0)] = 0,
        search: str | None = None,
        group_id: int | None = None,
) -> TeachersListResponse:
    return _service(db, current_user).list_teachers(
        limit=limit,
        offset=offset,
        search=search,
        group_id=group_id,
    )


@router.get('/{teacher_id}', response_model=TeacherDetail)
def get_teacher(
        teacher_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TeacherDetail:
    return _service(db, current_user).get_teacher(teacher_id)


@router.post('', response_model=TeacherDetail, status_code=status.HTTP_201_CREATED)
def create_teacher(
        data: TeacherCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TeacherDetail:
    return _service(db, current_user).create_teacher(data)


@router.patch('/{teacher_id}', response_model=TeacherDetail)
def update_teacher(
        teacher_id: int,
        data: TeacherUpdateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TeacherDetail:
    return _service(db, current_user).update_teacher(teacher_id, data)


@router.delete('/{teacher_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
        teacher_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _service(db, current_user).delete_teacher(teacher_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
