from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

import app.utils.security as security
from app.models.managers import Manager
from app.models.organization import User, UserType

from .base import BaseRepository
from .organization import UserRepository


class ManagerRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, organization_id: int | None = None) -> list[Manager]:
        stmt = select(Manager).options(selectinload(Manager.user))
        if organization_id is not None:
            stmt = stmt.join(Manager.user).where(User.organization_id == organization_id)
        return self.db.scalars(stmt).all()

    def get(self, manager_id: int) -> Manager | None:
        stmt = select(Manager).where(Manager.id == manager_id).options(selectinload(Manager.user))
        return self.db.scalar(stmt)

    def create(
        self,
        *,
        login: str,
        password: str,
        organization_id: int,
        first_name: str,
        last_name: str,
        phone: str | None = None,
    ) -> Manager:
        user = UserRepository.make_user(
            login=login,
            password=password,
            organization_id=organization_id,
            role=UserType.manager,
        )
        manager = Manager(
            user=user,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
        )
        return self._save(manager)

    def update(
        self,
        manager_id: int,
        *,
        login: str | None = None,
        password: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        phone_set: bool = False,
    ) -> Manager | None:
        manager = self.db.get(Manager, manager_id)
        if manager is None:
            return None

        if first_name is not None:
            manager.first_name = first_name
        if last_name is not None:
            manager.last_name = last_name
        if phone_set:
            manager.phone = phone

        if manager.user is not None:
            if login is not None:
                manager.user.login = login
            if password is not None:
                manager.user.password_hash = security.hash_password(password)

        self.db.commit()
        self.db.refresh(manager)
        return manager

    def delete(self, manager_id: int) -> bool:
        manager = self.db.get(Manager, manager_id)
        if manager is None:
            return False

        user = manager.user
        self.db.delete(manager)
        if user is not None:
            self.db.delete(user)
        self.db.commit()
        return True
