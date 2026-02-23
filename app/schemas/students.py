from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.refs import GroupRef


class StudentBase(BaseModel):
    first_name: str
    last_name: str
    parent_phone: str | None = None
    birth_date: date | None = None
    model_config = ConfigDict(from_attributes=True)


class StudentCreate(StudentBase):
    group_ids: list[int] = Field(default_factory=list)


class StudentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    parent_phone: str | None = None
    birth_date: date | None = None
    group_ids: list[int] | None = None
    model_config = ConfigDict(from_attributes=True)


class StudentSimple(BaseModel):
    id: int
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


class StudentOut(StudentBase):
    id: int
    age: int | None = None
    groups: list[GroupRef] = Field(default_factory=list)


class StudentHomeworkBase(BaseModel):
    answer: str | None = None
    group_lesson_id: int
    student_id: int
    grade: int | None = None
    teacher_comment: str | None = None
    model_config = ConfigDict(from_attributes=True)


class StudentHomeworkCreate(StudentHomeworkBase):
    pass


class StudentHomeworkUpdate(BaseModel):
    answer: str | None = None
    grade: int | None = None
    teacher_comment: str | None = None
    model_config = ConfigDict(from_attributes=True)


class StudentHomeworkOut(StudentHomeworkBase):
    id: int
