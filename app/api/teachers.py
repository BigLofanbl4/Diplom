from fastapi import APIRouter, Form, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Annotated
from ..schemas import TeacherCreate, TeacherUpdate
from sqlalchemy.orm import Session
from ..database import get_db
from ..repositories import TeacherRepository

router = APIRouter(prefix='/teachers', tags=['teachers'])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="")

@router.get('/')
def index():
    return {'Hello': 'World'}


@router.post('/register')
def register(data: Annotated[TeacherCreate, Form()], db: Session = Depends(get_db)) -> bool:
    TeacherRepository(db).create(
        data.login,
        data.password,
        data.organization_id,
        data.first_name,
        data.last_name,
        data.birth_date,
        data.phone
    )

    return True


@router.post('/list/{teacher_id)')
def register(data: Annotated[TeacherCreate, Form()], db: Session = Depends(get_db)) -> bool:
    TeacherRepository(db).create(
        data.login,
        data.password,
        data.organization_id,
        data.first_name,
        data.last_name,
        data.birth_date,
        data.phone
    )

    return True

