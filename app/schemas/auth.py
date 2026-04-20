from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    login: str
    role: str
    organization_id: int
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    is_ovz: bool | None = None
