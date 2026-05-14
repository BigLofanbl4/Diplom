from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import User
from app.schemas.managers import (
    ManagerCreateRequest,
    ManagerListItem,
    ManagersListResponse,
    ManagerUpdateRequest,
)
from app.services.managers import ManagerAdminService

from .auth import get_current_user

router = APIRouter(prefix="/managers", tags=["managers"])


def _service(db: Session, current_user: User) -> ManagerAdminService:
    return ManagerAdminService(db, current_user)


@router.get("", response_model=ManagersListResponse)
def list_managers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: Annotated[str | None, Query()] = None,
) -> ManagersListResponse:
    return _service(db, current_user).list_managers(search)


@router.get("/{manager_id}", response_model=ManagerListItem)
def get_manager(
    manager_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ManagerListItem:
    return _service(db, current_user).get_manager(manager_id)


@router.post("", response_model=ManagerListItem, status_code=status.HTTP_201_CREATED)
def create_manager(
    data: ManagerCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ManagerListItem:
    return _service(db, current_user).create_manager(data)


@router.patch("/{manager_id}", response_model=ManagerListItem)
def update_manager(
    manager_id: int,
    data: ManagerUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ManagerListItem:
    return _service(db, current_user).update_manager(manager_id, data)


@router.delete("/{manager_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manager(
    manager_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _service(db, current_user).delete_manager(manager_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
