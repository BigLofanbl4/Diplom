from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ManagersListMeta(BaseModel):
    totals: int
    search: str | None = None


class ManagerListItem(BaseModel):
    id: int
    login: str
    first_name: str
    last_name: str
    phone: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ManagersListResponse(BaseModel):
    data: list[ManagerListItem]
    meta: ManagersListMeta


class ManagerCreateRequest(BaseModel):
    login: str
    password: str
    first_name: str
    last_name: str
    phone: str | None = None


class ManagerUpdateRequest(BaseModel):
    login: str | None = None
    password: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
