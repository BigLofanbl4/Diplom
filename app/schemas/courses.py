from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CourseBase(BaseModel):
    title: str
    description: str | None = None
    model_config = ConfigDict(from_attributes=True)


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    model_config = ConfigDict(from_attributes=True)


class CourseSimple(CourseBase):
    id: int


class CourseModuleBase(BaseModel):
    title: str
    module_number: int
    course_id: int
    model_config = ConfigDict(from_attributes=True)


class CourseModuleCreate(CourseModuleBase):
    pass


class CourseModuleUpdate(BaseModel):
    title: str | None = None
    module_number: int | None = None
    model_config = ConfigDict(from_attributes=True)


class CourseModuleOut(CourseModuleBase):
    id: int


class CourseLessonBase(BaseModel):
    title: str
    lesson_number: int
    description: str | None = None
    course_id: int
    module_id: int | None = None
    model_config = ConfigDict(from_attributes=True)


class CourseLessonCreate(CourseLessonBase):
    pass


class CourseLessonUpdate(BaseModel):
    title: str | None = None
    lesson_number: int | None = None
    description: str | None = None
    module_id: int | None = None
    model_config = ConfigDict(from_attributes=True)


class CourseLessonOut(CourseLessonBase):
    id: int


class FileBase(BaseModel):
    path: str
    material_id: int
    model_config = ConfigDict(from_attributes=True)


class FileCreate(FileBase):
    pass


class FileOut(FileBase):
    id: int


class CourseMaterialBase(BaseModel):
    homework_file: str | None = None
    homework_text: str | None = None
    course_id: int
    lesson_id: int
    model_config = ConfigDict(from_attributes=True)


class CourseMaterialCreate(CourseMaterialBase):
    pass


class CourseMaterialUpdate(BaseModel):
    homework_file: str | None = None
    homework_text: str | None = None
    lesson_id: int | None = None
    model_config = ConfigDict(from_attributes=True)


class CourseMaterialOut(CourseMaterialBase):
    id: int
    files: list[FileOut] = Field(default_factory=list)


class CourseOut(CourseSimple):
    modules: list[CourseModuleOut] = Field(default_factory=list)
    lessons: list[CourseLessonOut] = Field(default_factory=list)
    materials: list[CourseMaterialOut] = Field(default_factory=list)
