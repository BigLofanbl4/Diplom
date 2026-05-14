from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.refs import GroupRef


class StudentCreateRequest(BaseModel):
    first_name: str
    last_name: str
    login: str
    password: str
    phone: str | None = None
    birth_date: date | None = None
    group_ids: list[int] = Field(default_factory=list)


class StudentUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    login: str | None = None
    password: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    group_ids: list[int] | None = None


class StudentListItem(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str | None = None
    birth_date: date | None = None
    login: str
    groups_count: int
    model_config = ConfigDict(from_attributes=True)


class StudentsListResponse(BaseModel):
    data: list[StudentListItem]


class StudentDetail(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str | None = None
    birth_date: date | None = None
    login: str
    group_ids: list[int]
    groups: list[GroupRef]
    model_config = ConfigDict(from_attributes=True)
