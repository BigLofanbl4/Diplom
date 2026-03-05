from typing import Annotated

from fastapi import Depends, HTTPException, APIRouter, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from ..database import get_db
from ..repositories import TeacherRepository, AdminRepository
from ..schemas import UserOut, TokenOut
from ..services import AuthService
from ..utils.auth import decode_jwt

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
        token: Annotated[str, Depends(oauth2_scheme)],
        db: Annotated[Session, Depends(get_db)]
):
    try:
        data = decode_jwt(token)
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"invalid token error",
        )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    if data['is_admin']:
        admin = AdminRepository(db).get_admin(admin_id=data["sub"])
        return admin, 'admin'

    teacher = TeacherRepository(db).get_teacher(teacher_id=data["sub"])
    return teacher, 'teacher'


def require_teacher(answer=Depends(get_current_user)):
    user, role = answer

    if role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


@router.get('/current_user', response_model=UserOut)
def current_user(
        answer=Depends(get_current_user),
):
    user, role = answer
    return UserOut(
        id=user.id,
        username=user.login,
        organization_id=user.organization_id,
        role=role
    )


@router.post("/login", response_model=TokenOut)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):
    auth = AuthService(TeacherRepository(db), AdminRepository(db))
    return auth.authenticate(form_data.username, form_data.password)
