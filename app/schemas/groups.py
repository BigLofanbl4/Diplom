from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.refs import StudentRef, TeacherRef


class GroupBase(BaseModel):
    group_number: str
    course_id: int | None = None
    teacher_id: int | None = None
    model_config = ConfigDict(from_attributes=True)


class GroupCreate(GroupBase):
    student_ids: list[int] = Field(default_factory=list)


class GroupUpdate(BaseModel):
    group_number: str | None = None
    course_id: int | None = None
    teacher_id: int | None = None
    student_ids: list[int] | None = None
    model_config = ConfigDict(from_attributes=True)


class GroupSimple(GroupBase):
    id: int


class GroupOut(GroupSimple):
    students: list[StudentRef] = Field(default_factory=list)
    teacher: TeacherRef | None = None


class GroupLessonBase(BaseModel):
    lesson_number: int
    group_id: int
    material_links: list[str] = Field(default_factory=list)
    module_id: int | None = None
    homework_text: str | None = None
    homework_file: str | None = None
    model_config = ConfigDict(from_attributes=True)


class GroupLessonCreate(GroupLessonBase):
    pass


class GroupLessonUpdate(BaseModel):
    lesson_number: int | None = None
    material_links: list[str] | None = None
    module_id: int | None = None
    homework_text: str | None = None
    homework_file: str | None = None
    model_config = ConfigDict(from_attributes=True)


class GroupLessonOut(GroupLessonBase):
    id: int
