from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.organization import User
from ..repositories.organization import UserRepository
from ..schemas import UserOut, TokenOut
from ..services import AuthService
from ..utils.auth import decode_jwt
from ..utils.api_errors import forbidden

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


def _require_token_type(payload: dict, expected_token_type: str, error_detail: str) -> None:
    if payload.get("token_type") != expected_token_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail,
        )


def _extract_user_id(payload: dict, error_detail: str) -> int:
    raw_user_id = payload.get("sub")
    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail,
        )


def get_current_user(
        token: Annotated[str, Depends(oauth2_scheme)],
        db: Annotated[Session, Depends(get_db)]
) -> User:
    try:
        payload = decode_jwt(token)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    _require_token_type(payload, expected_token_type="access", error_detail="Invalid access token")
    user = UserRepository(db).get_user(user_id=_extract_user_id(payload, "Invalid access token"))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )
    return user


def require_teacher(user: Annotated[User, Depends(get_current_user)]) -> User:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role != "teacher":
        raise forbidden()
    return user


@router.get('/current_user', response_model=UserOut)
def current_user(
        user: Annotated[User, Depends(get_current_user)],
) -> UserOut:
    return UserOut(
        id=user.id,
        username=user.login,
        organization_id=user.organization_id,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
    )


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

    try:
        payload = decode_jwt(refresh_token)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    _require_token_type(payload, expected_token_type="refresh", error_detail="Invalid refresh token")
    user_id = _extract_user_id(payload, "Invalid refresh token")

    user_repo = UserRepository(db)
    user = user_repo.get_user(user_id=user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    auth_service = AuthService(user_repo)
    return auth_service.issue_access_token(user)


@router.post("/login", response_model=TokenOut)
def login(
        response: Response,
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: Annotated[Session, Depends(get_db)],
) -> TokenOut:
    auth = AuthService(UserRepository(db))
    access_token, refresh_token = auth.authenticate(form_data.username, form_data.password)
    _set_refresh_cookie(response, refresh_token)
    return access_token
