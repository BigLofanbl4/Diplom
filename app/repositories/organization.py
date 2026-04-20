from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

import app.utils.security as security
from app.models.organization import Admin, Organization, User, UserType

from .base import BaseRepository


class OrganizationRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self) -> list[Organization]:
        stmt = select(Organization).options(
            selectinload(Organization.users),
            selectinload(Organization.courses),
            selectinload(Organization.groups),
        )
        return self.db.scalars(stmt).all()

    def get(self, organization_id: int) -> Organization | None:
        stmt = (
            select(Organization)
            .where(Organization.id == organization_id)
            .options(
                selectinload(Organization.users),
                selectinload(Organization.courses),
                selectinload(Organization.groups),
            )
        )
        return self.db.scalar(stmt)

    def get_organization(self, organization_id: int) -> Organization | None:
        return self.get(organization_id)

    def create(
        self,
        legal_address: str,
        payment_start_date: date | None = None,
        payment_end_date: date | None = None,
    ) -> Organization:
        organization = Organization(
            legal_address=legal_address,
            payment_start_date=payment_start_date,
            payment_end_date=payment_end_date,
        )
        return self._save(organization)

    def update(
        self,
        organization_id: int,
        *,
        legal_address: str | None = None,
        payment_start_date: date | None = None,
        payment_end_date: date | None = None,
    ) -> Organization | None:
        organization = self.db.get(Organization, organization_id)
        if organization is None:
            return None

        updates: dict[str, date | str] = {}
        if legal_address is not None:
            updates["legal_address"] = legal_address
        if payment_start_date is not None:
            updates["payment_start_date"] = payment_start_date
        if payment_end_date is not None:
            updates["payment_end_date"] = payment_end_date

        if updates:
            self._apply_updates(organization, updates)
            self.db.commit()
            self.db.refresh(organization)

        return organization

    def delete(self, organization_id: int) -> bool:
        organization = self.db.get(Organization, organization_id)
        if organization is None:
            return False
        self.db.delete(organization)
        self.db.commit()
        return True


class UserRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    @staticmethod
    def _normalize_role(role: UserType | str) -> UserType:
        if isinstance(role, UserType):
            return role
        return UserType(role)

    @staticmethod
    def make_user(
        *,
        login: str,
        password: str,
        organization_id: int,
        role: UserType | str,
    ) -> User:
        role_enum = UserRepository._normalize_role(role)
        return User(
            login=login,
            password_hash=security.hash_password(password),
            organization_id=organization_id,
            role=role_enum,
        )

    def list(
        self,
        *,
        organization_id: int | None = None,
        role: UserType | str | None = None,
    ) -> list[User]:
        stmt = select(User).options(
            selectinload(User.admin),
            selectinload(User.manager),
            selectinload(User.teacher),
            selectinload(User.student),
        )
        if organization_id is not None:
            stmt = stmt.where(User.organization_id == organization_id)
        if role is not None:
            stmt = stmt.where(User.role == self._normalize_role(role))
        return self.db.scalars(stmt).all()

    def get(self, user_id: int) -> User | None:
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.admin),
                selectinload(User.manager),
                selectinload(User.teacher),
                selectinload(User.student),
            )
        )
        return self.db.scalar(stmt)

    def get_user(self, user_login: str | None = None, user_id: int | None = None) -> User | None:
        if user_id is not None:
            return self.get(user_id)
        if user_login is not None:
            stmt = (
                select(User)
                .where(User.login == user_login)
                .options(
                    selectinload(User.admin),
                    selectinload(User.manager),
                    selectinload(User.teacher),
                    selectinload(User.student),
                )
            )
            return self.db.scalar(stmt)
        return None

    def create(self, login: str, password: str, organization_id: int, role: UserType | str) -> User:
        user = self.make_user(
            login=login,
            password=password,
            organization_id=organization_id,
            role=role,
        )
        return self._save(user)

    def update(
        self,
        user_id: int,
        *,
        login: str | None = None,
        password: str | None = None,
        organization_id: int | None = None,
        role: UserType | str | None = None,
    ) -> User | None:
        user = self.db.get(User, user_id)
        if user is None:
            return None

        if login is not None:
            user.login = login
        if password is not None:
            user.password_hash = security.hash_password(password)
        if organization_id is not None:
            user.organization_id = organization_id
        if role is not None:
            user.role = self._normalize_role(role)

        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user_id: int) -> bool:
        user = self.db.get(User, user_id)
        if user is None:
            return False
        self.db.delete(user)
        self.db.commit()
        return True

    def verify_password(self, user: User, password: str) -> bool:
        return security.verify_password(password, user.password_hash)


class AdminRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, organization_id: int | None = None) -> list[Admin]:
        stmt = select(Admin).options(selectinload(Admin.user))
        if organization_id is not None:
            stmt = stmt.join(Admin.user).where(User.organization_id == organization_id)
        return self.db.scalars(stmt).all()

    def get(self, admin_id: int) -> Admin | None:
        stmt = select(Admin).where(Admin.id == admin_id).options(selectinload(Admin.user))
        return self.db.scalar(stmt)

    def get_admin(self, admin_login: str | None = None, admin_id: int | None = None) -> Admin | None:
        if admin_id is not None:
            return self.get(admin_id)
        if admin_login is not None:
            stmt = (
                select(Admin)
                .join(Admin.user)
                .where(User.login == admin_login)
                .options(selectinload(Admin.user))
            )
            return self.db.scalar(stmt)
        return None

    def create(
        self,
        login: str,
        password: str,
        organization_id: int,
        first_name: str = "",
        last_name: str = "",
    ) -> Admin:
        user = UserRepository.make_user(
            login=login,
            password=password,
            organization_id=organization_id,
            role=UserType.admin,
        )
        admin = Admin(
            first_name=first_name,
            last_name=last_name,
            user=user,
        )
        return self._save(admin)

    def create_with_user(self, user_id: int, first_name: str = "", last_name: str = "") -> Admin:
        admin = Admin(user_id=user_id, first_name=first_name, last_name=last_name)
        return self._save(admin)

    def update(
        self,
        admin_id: int,
        *,
        first_name: str | None = None,
        last_name: str | None = None,
        login: str | None = None,
        password: str | None = None,
        organization_id: int | None = None,
    ) -> Admin | None:
        admin = self.db.get(Admin, admin_id)
        if admin is None:
            return None

        if first_name is not None:
            admin.first_name = first_name
        if last_name is not None:
            admin.last_name = last_name

        if admin.user is not None:
            if login is not None:
                admin.user.login = login
            if password is not None:
                admin.user.password_hash = security.hash_password(password)
            if organization_id is not None:
                admin.user.organization_id = organization_id

        self.db.commit()
        self.db.refresh(admin)
        return admin

    def delete(self, admin_id: int) -> bool:
        admin = self.db.get(Admin, admin_id)
        if admin is None:
            return False

        user = admin.user
        self.db.delete(admin)
        if user is not None:
            self.db.delete(user)
        self.db.commit()
        return True

    def update_password(self, login: str, new_password: str) -> bool:
        user = UserRepository(self.db).get_user(user_login=login)
        if user is None:
            return False

        user.password_hash = security.hash_password(new_password)
        self.db.commit()
        return True
