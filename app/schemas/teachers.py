from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.refs import GroupRef


class TeacherBase(BaseModel):
    login: str
    phone: str | None = None
    first_name: str
    last_name: str
    birth_date: date | None = None
    is_ovz: bool = False
    organization_id: int
    model_config = ConfigDict(from_attributes=True)


class TeacherCreate(TeacherBase):
    password: str
    group_ids: list[int] = Field(default_factory=list)


class TeacherUpdate(BaseModel):
    login: str | None = None
    password: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    birth_date: date | None = None
    is_ovz: bool | None = None
    phone: str | None = None
    organization_id: int | None = None
    group_ids: list[int] | None = None
    model_config = ConfigDict(from_attributes=True)


class TeacherSimple(BaseModel):
    id: int
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


class TeacherOut(TeacherBase):
    id: int
    groups: list[GroupRef] = Field(default_factory=list)
