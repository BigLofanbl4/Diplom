from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import User
from app.repositories import ManagerRepository
from app.utils.api_errors import forbidden, not_found
from app.utils.serializers import serialize_manager

from .auth import get_current_user

router = APIRouter(prefix="/managers", tags=["managers"])


class ManagersListMeta(BaseModel):
    totals: int
    search: str | None = None


class ManagerListItem(BaseModel):
    id: int
    login: str
    first_name: str
    last_name: str
    phone: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ManagersListResponse(BaseModel):
    data: list[ManagerListItem]
    meta: ManagersListMeta


class ManagerCreateRequest(BaseModel):
    login: str
    password: str
    first_name: str
    last_name: str
    phone: str | None = None


class ManagerUpdateRequest(BaseModel):
    login: str | None = None
    password: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


def _ensure_admin(user: User) -> None:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role != "admin":
        raise forbidden()


def _scoped_manager_or_404(repo: ManagerRepository, manager_id: int, user: User):
    manager = repo.get(manager_id)
    if manager is None or manager.user is None or manager.user.organization_id != user.organization_id:
        raise not_found("Manager not found")
    return manager


@router.get("", response_model=ManagersListResponse)
def list_managers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: Annotated[str | None, Query()] = None,
) -> ManagersListResponse:
    _ensure_admin(current_user)
    managers = ManagerRepository(db).list(organization_id=current_user.organization_id)
    if search:
        term = search.lower()
        managers = [
            manager
            for manager in managers
            if term in f"{manager.first_name} {manager.last_name}".lower()
            or (manager.user is not None and term in manager.user.login.lower())
        ]
    items = [ManagerListItem.model_validate(serialize_manager(manager)) for manager in managers]
    return ManagersListResponse(
        data=items,
        meta=ManagersListMeta(totals=len(items), search=search),
    )


@router.get("/{manager_id}", response_model=ManagerListItem)
def get_manager(
    manager_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ManagerListItem:
    _ensure_admin(current_user)
    manager = _scoped_manager_or_404(ManagerRepository(db), manager_id, current_user)
    return ManagerListItem.model_validate(serialize_manager(manager))


@router.post("", response_model=ManagerListItem, status_code=status.HTTP_201_CREATED)
def create_manager(
    data: ManagerCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ManagerListItem:
    _ensure_admin(current_user)
    repo = ManagerRepository(db)
    try:
        manager = repo.create(
            login=data.login,
            password=data.password,
            organization_id=current_user.organization_id,
            first_name=data.first_name,
            last_name=data.last_name,
            phone=data.phone,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
    return ManagerListItem.model_validate(serialize_manager(manager))


@router.patch("/{manager_id}", response_model=ManagerListItem)
def update_manager(
    manager_id: int,
    data: ManagerUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ManagerListItem:
    _ensure_admin(current_user)
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

    repo = ManagerRepository(db)
    _scoped_manager_or_404(repo, manager_id, current_user)
    try:
        manager = repo.update(
            manager_id,
            login=payload.get("login"),
            password=payload.get("password"),
            first_name=payload.get("first_name"),
            last_name=payload.get("last_name"),
            phone=payload.get("phone"),
            phone_set="phone" in payload,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
    if manager is None:
        raise not_found("Manager not found")
    return ManagerListItem.model_validate(serialize_manager(manager))


@router.delete("/{manager_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manager(
    manager_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _ensure_admin(current_user)
    repo = ManagerRepository(db)
    _scoped_manager_or_404(repo, manager_id, current_user)
    repo.delete(manager_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
