from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.organization import User
from ..schemas import UserOut, TokenOut
from ..services import AuthService
from ..utils.api_errors import forbidden
from ..utils.serializers import serialize_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
REFRESH_COOKIE_KEY = "refresh_token"
REFRESH_COOKIE_PATH = f"{settings.api_v1_prefix}/auth/refresh"
REFRESH_COOKIE_MAX_AGE = settings.auth_jwt.refresh_token_expire_days * 24 * 60 * 60


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value=refresh_token,
        httponly=True,
        max_age=REFRESH_COOKIE_MAX_AGE,
        path=REFRESH_COOKIE_PATH,
        samesite="lax",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value="",
        httponly=True,
        max_age=0,
        expires=0,
        path=REFRESH_COOKIE_PATH,
        samesite="lax",
    )


def get_current_user(
        token: Annotated[str, Depends(oauth2_scheme)],
        db: Annotated[Session, Depends(get_db)]
) -> User:
    return AuthService.for_session(db).authenticate_access_token(token)


def require_teacher(user: Annotated[User, Depends(get_current_user)]) -> User:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role != "teacher":
        raise forbidden()
    return user


@router.get('/current_user', response_model=UserOut)
def current_user(
        user: Annotated[User, Depends(get_current_user)],
) -> UserOut:
    return UserOut.model_validate(serialize_current_user(user))


@router.post("/logout")
def logout(
        response: Response,
):
    _clear_refresh_cookie(response)
    return {"detail": "Logged out"}


@router.post("/refresh", response_model=TokenOut)
def refresh(
        request: Request,
        db: Annotated[Session, Depends(get_db)],
) -> TokenOut:
    if REFRESH_COOKIE_KEY not in request.cookies:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cookie not found",
        )

    refresh_token = request.cookies.get(REFRESH_COOKIE_KEY)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token found",
        )

    return AuthService.for_session(db).refresh_access_token(refresh_token)


@router.post("/login", response_model=TokenOut)
def login(
        response: Response,
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: Annotated[Session, Depends(get_db)],
) -> TokenOut:
    auth = AuthService.for_session(db)
    access_token, refresh_token = auth.authenticate(form_data.username, form_data.password)
    _set_refresh_cookie(response, refresh_token)
    return access_token
