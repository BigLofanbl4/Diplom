from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.organization import Organization, Admin
import app.utils.security as security


class OrganizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create (self, legal_address: str, payment_start_date, payment_end_date):
        organization = Organization(
            payment_start_date=payment_start_date,
            payment_end_date=payment_end_date,
            legal_address=legal_address,
        )
        self.db.add(organization)
        self.db.commit()

    def delete(self, organization_id: int):
        org = self.db.get(Organization, organization_id)
        self.db.delete(org)
        self.db.commit()


class AdminRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self):
        stmt = select(Admin)
        admins = self.db.scalars(stmt).all()
        return admins

    def create(self, login: str, password: str, organization_id: int):
        hashed_password = security.hash_password(password)
        admin = Admin(
            login=login,
            password_hash=hashed_password,
            organization_id=organization_id
        )
        self.db.add(admin)
        self.db.commit()

    def delete(self, admin_id: int):
        admin = self.db.get(Admin, admin_id)
        self.db.delete(admin)

    def verify_password(self, login: str, password: str):
        stmt = select(Admin).where(Admin.login == login)
        admin = self.db.scalar(stmt)
        return security.verify_password(password, admin.password)

    def update_password(self, login: str, new_password: str):
        pass


