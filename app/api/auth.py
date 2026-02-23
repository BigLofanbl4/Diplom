from fastapi import Depends, HTTPException, APIRouter, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Annotated
from ..database import get_db
from sqlalchemy.orm import Session
from ..schemas import UserOut, TokenOut
from ..utils.auth import decode_jwt, encode_jwt
from ..repositories import TeacherRepository, AdminRepository
from jwt.exceptions import InvalidTokenError


from ..schemas import TeacherCreate, TeacherUpdate, TeacherOut
from ..utils.security import verify_password


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

@router.get('/current_user', response_model=UserOut)
def current_user(
        answer = Depends(get_current_user),
):
    user, role = answer
    return UserOut(
        id = user.id,
        username = user.login,
        organization_id = user.organization_id,
        role = role
    )


@router.post("/login", response_model=TokenOut)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):
    error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    admin = AdminRepository(db).get_admin(admin_login=form_data.username)
    if admin and verify_password(form_data.password, admin.password_hash):
        claims = {
            "sub": str(admin.id),
            "username": form_data.username,
            "is_admin": True
        }
    else:
        teacher = TeacherRepository(db).get_teacher(teacher_login=form_data.username)
        if not teacher or not verify_password(form_data.password, teacher.password_hash):
            raise error
        claims = {
            "sub": str(teacher.id),
            "username": form_data.username,
            "is_admin": False
        }

    token = encode_jwt(payload=claims)

    return TokenOut(
        access_token=token,
        token_type="bearer",
    )




