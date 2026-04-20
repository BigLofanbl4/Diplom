from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class CourseRef(BaseModel):
    id: int
    title: str
    model_config = ConfigDict(from_attributes=True)


class TeacherRef(BaseModel):
    id: int
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


class StudentRef(BaseModel):
    id: int
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


class GroupRef(BaseModel):
    id: int
    group_number: str
    model_config = ConfigDict(from_attributes=True)
