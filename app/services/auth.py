from datetime import timedelta
from uuid import uuid4

from ..config import settings
from ..models.organization import User
from ..repositories.organization import UserRepository
from ..schemas import TokenOut
from ..utils.auth import encode_jwt
from ..utils.api_errors import invalid_credentials


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def authenticate(self, username: str, password: str) -> tuple[TokenOut, str]:
        user = self.user_repo.get_user(user_login=username)
        if user and self.user_repo.verify_password(user, password):
            return self.issue_token_pair(user)
        else:
            raise invalid_credentials()

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
