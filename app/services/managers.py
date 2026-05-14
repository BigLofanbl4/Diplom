from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.managers import Manager
from app.models.organization import User
from app.repositories import ManagerRepository
from app.schemas.managers import (
    ManagerCreateRequest,
    ManagerListItem,
    ManagersListMeta,
    ManagersListResponse,
    ManagerUpdateRequest,
)
from app.utils.api_errors import forbidden, not_found
from app.utils.serializers import serialize_manager


class ManagerAdminService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
        self.repo = ManagerRepository(db)

    def list_managers(self, search: str | None = None) -> ManagersListResponse:
        self._ensure_admin()
        managers = self.repo.list(organization_id=self.current_user.organization_id)
        if search:
            term = search.lower()
            managers = [
                manager
                for manager in managers
                if term in f"{manager.first_name} {manager.last_name}".lower()
                or (manager.user is not None and term in manager.user.login.lower())
            ]
        items = [self._to_item(manager) for manager in managers]
        return ManagersListResponse(
            data=items,
            meta=ManagersListMeta(totals=len(items), search=search),
        )

    def get_manager(self, manager_id: int) -> ManagerListItem:
        self._ensure_admin()
        manager = self._scoped_manager_or_404(manager_id)
        return self._to_item(manager)

    def create_manager(self, data: ManagerCreateRequest) -> ManagerListItem:
        self._ensure_admin()
        try:
            manager = self.repo.create(
                login=data.login,
                password=data.password,
                organization_id=self.current_user.organization_id,
                first_name=data.first_name,
                last_name=data.last_name,
                phone=data.phone,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
        return self._to_item(manager)

    def update_manager(self, manager_id: int, data: ManagerUpdateRequest) -> ManagerListItem:
        self._ensure_admin()
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

        self._scoped_manager_or_404(manager_id)
        try:
            manager = self.repo.update(
                manager_id,
                login=payload.get("login"),
                password=payload.get("password"),
                first_name=payload.get("first_name"),
                last_name=payload.get("last_name"),
                phone=payload.get("phone"),
                phone_set="phone" in payload,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
        if manager is None:
            raise not_found("Manager not found")
        return self._to_item(manager)

    def delete_manager(self, manager_id: int) -> None:
        self._ensure_admin()
        self._scoped_manager_or_404(manager_id)
        self.repo.delete(manager_id)

    def _ensure_admin(self) -> None:
        role = self.current_user.role.value if hasattr(self.current_user.role, "value") else str(self.current_user.role)
        if role != "admin":
            raise forbidden()

    def _scoped_manager_or_404(self, manager_id: int) -> Manager:
        manager = self.repo.get(manager_id)
        if (
            manager is None
            or manager.user is None
            or manager.user.organization_id != self.current_user.organization_id
        ):
            raise not_found("Manager not found")
        return manager

    @staticmethod
    def _to_item(manager: Manager) -> ManagerListItem:
        return ManagerListItem.model_validate(serialize_manager(manager))
