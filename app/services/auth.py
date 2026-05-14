from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from ..config import settings
from ..models.organization import User
from ..repositories.organization import UserRepository
from ..schemas import TokenOut
from ..utils.auth import decode_jwt, encode_jwt
from ..utils.api_errors import invalid_credentials


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    @classmethod
    def for_session(cls, db: Session) -> "AuthService":
        return cls(UserRepository(db))

    def authenticate(self, username: str, password: str) -> tuple[TokenOut, str]:
        user = self.user_repo.get_user(user_login=username)
        if user and self.user_repo.verify_password(user, password):
            return self.issue_token_pair(user)
        else:
            raise invalid_credentials()

    def authenticate_access_token(self, token: str) -> User:
        payload = self._decode_token(token, "Invalid access token")
        self._require_token_type(payload, expected_token_type="access", error_detail="Invalid access token")
        user = self.user_repo.get_user(user_id=self._extract_user_id(payload, "Invalid access token"))
        if user is None:
            raise self._unauthorized("Invalid access token")
        return user

    def refresh_access_token(self, refresh_token: str) -> TokenOut:
        payload = self._decode_token(refresh_token, "Invalid refresh token")
        self._require_token_type(payload, expected_token_type="refresh", error_detail="Invalid refresh token")
        user = self.user_repo.get_user(user_id=self._extract_user_id(payload, "Invalid refresh token"))
        if user is None:
            raise self._unauthorized("Invalid refresh token")
        return self.issue_access_token(user)

    def issue_token_pair(self, user: User) -> tuple[TokenOut, str]:
        return self.issue_access_token(user), self.issue_refresh_token(user)

    def issue_access_token(self, user: User) -> TokenOut:
        claims = self._base_claims(user)
        claims["token_type"] = "access"
        token = encode_jwt(payload=claims)
        return TokenOut(
            access_token=token,
            token_type="bearer",
        )

    def issue_refresh_token(self, user: User) -> str:
        claims = self._base_claims(user)
        claims.update(
            token_type="refresh",
            jti=str(uuid4()),
        )
        return encode_jwt(
            payload=claims,
            expire_timedelta=timedelta(days=settings.auth_jwt.refresh_token_expire_days),
        )

    @staticmethod
    def _base_claims(user: User) -> dict[str, str]:
        return {
            "sub": str(user.id),
            "username": user.login,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        }

    @classmethod
    def _decode_token(cls, token: str, error_detail: str) -> dict:
        try:
            return decode_jwt(token)
        except InvalidTokenError:
            raise cls._unauthorized(error_detail)

    @classmethod
    def _require_token_type(cls, payload: dict, expected_token_type: str, error_detail: str) -> None:
        if payload.get("token_type") != expected_token_type:
            raise cls._unauthorized(error_detail)

    @classmethod
    def _extract_user_id(cls, payload: dict, error_detail: str) -> int:
        raw_user_id = payload.get("sub")
        try:
            return int(raw_user_id)
        except (TypeError, ValueError):
            raise cls._unauthorized(error_detail)

    @staticmethod
    def _unauthorized(detail: str) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )
