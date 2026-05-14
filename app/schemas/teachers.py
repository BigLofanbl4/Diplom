from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.refs import GroupRef


class TeachersListMeta(BaseModel):
    totals: int
    limit: int
    offset: int
    search: str | None = None


class TeacherListItem(BaseModel):
    id: int
    login: str
    phone: str | None = None
    first_name: str
    last_name: str
    age: int | None = None
    is_ovz: bool
    organization_id: int
    groups_count: int
    availability_for_group: dict | None = None
    model_config = ConfigDict(from_attributes=True)


class TeachersListResponse(BaseModel):
    data: list[TeacherListItem]
    meta: TeachersListMeta


class TeacherCreateRequest(BaseModel):
    first_name: str
    last_name: str
    login: str
    password: str
    phone: str | None = None
    age: int | None = Field(default=None, ge=0)
    birth_date: date | None = None
    is_ovz: bool = False
    organization_id: int | None = None
    group_ids: list[int] = Field(default_factory=list)


class TeacherUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    login: str | None = None
    password: str | None = None
    phone: str | None = None
    age: int | None = Field(default=None, ge=0)
    birth_date: date | None = None
    is_ovz: bool | None = None
    organization_id: int | None = None
    group_ids: list[int] | None = None


class TeacherDetail(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str | None = None
    age: int | None = None
    birth_date: date | None = None
    is_ovz: bool
    organization_id: int
    login: str
    group_ids: list[int]
    groups: list[GroupRef]
    course_ids: list[int] = Field(default_factory=list)
    schedule_preferences: list[dict] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)
