from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class CourseCreateRequest(BaseModel):
    title: str
    description: str | None = None


class CourseUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None


class CourseListItem(BaseModel):
    id: int
    title: str
    description: str | None = None
    kind: str | None = None
    template_course_id: int | None = None
    group_id: int | None = None
    teacher_id: int | None = None
    max_modules_count: int | None = None
    model_config = ConfigDict(from_attributes=True)


class CoursesListResponse(BaseModel):
    data: list[CourseListItem]


class CourseModuleOut(BaseModel):
    id: int
    title: str
    module_number: int
    course_id: int
    model_config = ConfigDict(from_attributes=True)


class CourseLessonShortOut(BaseModel):
    id: int
    title: str
    lesson_number: int
    description: str | None = None
    homework_text: str | None = None
    course_id: int
    module_id: int | None = None
    test_id: int | None = None
    materials: list[dict] = []
    model_config = ConfigDict(from_attributes=True)


class CourseDetail(BaseModel):
    id: int
    title: str
    description: str | None = None
    kind: str | None = None
    template_course_id: int | None = None
    group_id: int | None = None
    teacher_id: int | None = None
    max_modules_count: int | None = None
    template_course: dict | None = None
    template_modules: list[CourseModuleOut] = []
    template_lessons: list[CourseLessonShortOut] = []
    modules: list[CourseModuleOut]
    lessons: list[CourseLessonShortOut]
    model_config = ConfigDict(from_attributes=True, extra="allow")


class CourseModuleCreateRequest(BaseModel):
    title: str | None = None
    module_number: int


class CourseModuleUpdateRequest(BaseModel):
    title: str | None = None
    module_number: int | None = None


class LessonMaterialOut(BaseModel):
    id: int
    name: str
    size: int
    url: str
    model_config = ConfigDict(from_attributes=True)


class CourseLessonOut(BaseModel):
    id: int
    title: str
    lesson_number: int
    description: str | None = None
    homework_text: str | None = None
    course_id: int
    module_id: int | None = None
    test_id: int | None = None
    materials: list[LessonMaterialOut]
    model_config = ConfigDict(from_attributes=True)


class TestOut(BaseModel):
    id: int
    title: str
    questions_number: int
    questions: list[dict]
