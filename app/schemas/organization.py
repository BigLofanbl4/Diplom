from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.refs import AdminRef, TeacherRef


class OrganizationBase(BaseModel):
    legal_address: str
    payment_start_date: date | None = None
    payment_end_date: date | None = None
    model_config = ConfigDict(from_attributes=True)


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    legal_address: str | None = None
    payment_start_date: date | None = None
    payment_end_date: date | None = None
    model_config = ConfigDict(from_attributes=True)


class OrganizationOut(OrganizationBase):
    id: int
    admins: list[AdminRef] = Field(default_factory=list)
    teachers: list[TeacherRef] = Field(default_factory=list)


class AdminBase(BaseModel):
    login: str
    organization_id: int
    model_config = ConfigDict(from_attributes=True)


class AdminCreate(AdminBase):
    password: str


class AdminUpdate(BaseModel):
    login: str | None = None
    password: str | None = None
    organization_id: int | None = None
    model_config = ConfigDict(from_attributes=True)


class AdminOut(AdminBase):
    id: int
