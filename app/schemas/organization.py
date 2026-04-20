from __future__ import annotations

from pydantic import BaseModel, Field


class AdminCreate(BaseModel):
    login: str = Field(min_length=1)
    password: str = Field(min_length=1)
    organization_id: int
    first_name: str = ""
    last_name: str = ""
