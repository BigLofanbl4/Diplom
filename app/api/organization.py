from typing import Annotated

from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import AdminCreate
from ..services.organization import OrganizationRegistrationService

router = APIRouter(prefix='/organization', tags=['organization'])


@router.post('/register')
def register_admin(data: Annotated[AdminCreate, Form()], db: Session = Depends(get_db)) -> bool:
    return OrganizationRegistrationService(db).register_admin(data)
