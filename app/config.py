from __future__ import annotations

import os
from dataclasses import dataclass, field

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv()


@dataclass(slots=True)
class AuthJWTSettings:
    secret_key: str = field(
        default_factory=lambda: os.getenv("APP_SECRET_KEY", "dev-secret-key-for-diplom-app-32b")
    )
    algorithm: str = field(default_factory=lambda: os.getenv("APP_JWT_ALGORITHM", "HS256"))
    access_token_expire_minutes: int = field(
        default_factory=lambda: int(os.getenv("APP_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    )
    refresh_token_expire_days: int = field(
        default_factory=lambda: int(os.getenv("APP_REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    )


@dataclass(slots=True)
class Settings:
    api_v1_prefix: str = field(default_factory=lambda: os.getenv("API_V1_PREFIX", "/api/v1"))
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./app.db"))
    app_name: str = field(default_factory=lambda: os.getenv("APP_NAME", "Diplom API"))
    upload_dir: str = field(default_factory=lambda: os.getenv("UPLOAD_DIR", "./uploads"))
    upload_max_bytes: int = field(default_factory=lambda: int(os.getenv("UPLOAD_MAX_BYTES", str(20 * 1024 * 1024))))
    upload_allowed_extensions: set[str] = field(
        default_factory=lambda: {
            extension.strip().lower()
            for extension in os.getenv(
                "UPLOAD_ALLOWED_EXTENSIONS",
                ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt,.csv,.zip,.rar,.7z,.mp3,.mp4,.py,.js,.ts,.html,.css,.json,.md",
            ).split(",")
            if extension.strip()
        }
    )
    cors_origins: list[str] = field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
            if origin.strip()
        ]
    )
    auth_jwt: AuthJWTSettings = field(default_factory=AuthJWTSettings)


settings = Settings()
