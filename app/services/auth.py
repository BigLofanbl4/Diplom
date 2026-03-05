from fastapi import HTTPException, status

from app.repositories import AdminRepository, TeacherRepository
from ..schemas import TokenOut
from ..utils.auth import encode_jwt
from ..utils.security import verify_password


class AuthService:
    def __init__(self, teacher_repo: TeacherRepository, admin_repo: AdminRepository):
        self.teacher_repo = teacher_repo
        self.admin_repo = admin_repo

    def authenticate(self, username: str, password: str) -> TokenOut | HTTPException:
        error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login or password",
        )

        admin = self.admin_repo.get_admin(admin_login=username)
        if admin and verify_password(password, admin.password_hash):
            claims = {
                "sub": str(admin.id),
                "username": username,
                "is_admin": True
            }
        else:
            teacher = self.teacher_repo.get_teacher(teacher_login=username)
            if not teacher or not verify_password(password, teacher.password_hash):
                raise error
            claims = {
                "sub": str(teacher.id),
                "username": username,
                "is_admin": False
            }

        token = encode_jwt(payload=claims)

        return TokenOut(
            access_token=token,
            token_type="bearer",
        )
