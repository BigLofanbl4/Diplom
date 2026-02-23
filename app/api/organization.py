from fastapi import APIRouter, Form, Depends
from typing import Annotated
from ..schemas import AdminCreate
from sqlalchemy.orm import Session
from ..database import get_db
from ..repositories import AdminRepository

router = APIRouter(prefix='/organization', tags=['organization'])

@router.get('/')
def index():
    return {'Hello': 'World'}


@router.post('/register')
def login(data: Annotated[AdminCreate, Form()], db: Session = Depends(get_db)) -> bool:
    AdminRepository(db).create(data.login, data.password, data.organization_id)
    return True