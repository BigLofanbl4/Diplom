from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.organization import User
from ..schemas.groups import (
    GroupCreateRequest,
    GroupDetail,
    GroupsListResponse,
    GroupUpdateRequest,
)
from ..services.groups import GroupAdminService
from .auth import get_current_user

router = APIRouter(prefix='/groups', tags=['groups'])


def _service(db: Session, current_user: User) -> GroupAdminService:
    return GroupAdminService(db, current_user)


@router.get('', response_model=GroupsListResponse)
def list_groups(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        limit: Annotated[int, Query(ge=1, le=200)] = 50,
        offset: Annotated[int, Query(ge=0)] = 0,
        search: str | None = None,
) -> GroupsListResponse:
    return _service(db, current_user).list_groups(limit=limit, offset=offset, search=search)


@router.get('/{group_id}', response_model=GroupDetail)
def get_group(
        group_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
    return _service(db, current_user).get_group(group_id)


@router.post('', response_model=GroupDetail, status_code=status.HTTP_201_CREATED)
def create_group(
        data: GroupCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
    return _service(db, current_user).create_group(data)


@router.patch('/{group_id}', response_model=GroupDetail)
def update_group(
        group_id: int,
        data: GroupUpdateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
    return _service(db, current_user).update_group(group_id, data)


@router.delete('/{group_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
        group_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _service(db, current_user).delete_group(group_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
