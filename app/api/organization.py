from typing import Annotated

from fastapi import APIRouter, Form, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..repositories import AdminRepository
from ..schemas import AdminCreate

router = APIRouter(prefix='/organization', tags=['organization'])


@router.get('/')
def index():
    return {'Hello': 'World'}


@router.post('/register')
def login(data: Annotated[AdminCreate, Form()], db: Session = Depends(get_db)) -> bool:
    AdminRepository(db).create(data.login, data.password, data.organization_id)
    return True
