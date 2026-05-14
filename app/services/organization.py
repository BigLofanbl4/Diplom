from __future__ import annotations

from sqlalchemy.orm import Session

from app.repositories import AdminRepository
from app.schemas import AdminCreate


class OrganizationRegistrationService:
    def __init__(self, db: Session):
        self.db = db

    def register_admin(self, data: AdminCreate) -> bool:
        AdminRepository(self.db).create(
            data.login,
            data.password,
            data.organization_id,
            first_name=data.first_name,
            last_name=data.last_name,
        )
        return True
