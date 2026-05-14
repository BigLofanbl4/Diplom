from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.refs import CourseRef, StudentRef, TeacherRef


class GroupBase(BaseModel):
    group_number: str
    course_id: int
    teacher_id: int | None = None
    model_config = ConfigDict(from_attributes=True)


class GroupCreate(GroupBase):
    student_ids: list[int] = Field(default_factory=list)
    organization_id: int


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


class GroupsListMeta(BaseModel):
    totals: int
    limit: int
    offset: int
    search: str | None = None


class GroupListItem(BaseModel):
    id: int
    group_number: str
    teacher_id: int | None = None
    course_id: int | None = None
    course: CourseRef | None = None
    students_count: int
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    planned_schedule_slots: list[dict] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class GroupsListResponse(BaseModel):
    data: list[GroupListItem]
    meta: GroupsListMeta


class GroupCreateRequest(BaseModel):
    group_number: str
    teacher_id: int | None = None
    student_ids: list[int] = Field(default_factory=list)
    course_id: int | None = None
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    planned_schedule_slots: list[dict] = Field(default_factory=list)


class GroupUpdateRequest(BaseModel):
    group_number: str | None = None
    teacher_id: int | None = None
    student_ids: list[int] | None = None
    course_id: int | None = None
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    planned_schedule_slots: list[dict] | None = None


class GroupDetail(BaseModel):
    id: int
    group_number: str
    teacher_id: int | None = None
    course_id: int | None = None
    student_ids: list[int]
    teacher: TeacherRef | None = None
    course: CourseRef | None = None
    students: list[StudentRef]
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    planned_schedule_slots: list[dict] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)
