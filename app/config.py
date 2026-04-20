from __future__ import annotations

import os
from dataclasses import dataclass, field


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
    cors_origins: list[str] = field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
            if origin.strip()
        ]
    )
    auth_jwt: AuthJWTSettings = field(default_factory=AuthJWTSettings)


settings = Settings()
