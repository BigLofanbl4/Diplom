from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Course, CourseLesson, CourseMaterial, CourseModule
from app.schemas import (
    CourseCreate,
    CourseLessonCreate,
    CourseLessonUpdate,
    CourseMaterialCreate,
    CourseMaterialUpdate,
    CourseModuleCreate,
    CourseModuleUpdate,
    CourseUpdate,
)


class CourseRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_course_by_id(self, course_id: int) -> Course | None:
        return self.db.query(Course).filter(Course.id == course_id).first()

    def get_courses(self, skip: int = 0, limit: int = 100) -> list[Course]:
        return self.db.query(Course).offset(skip).limit(limit).all()

    def create_course(self, course: CourseCreate) -> Course:
        db_course = Course(title=course.title, description=course.description)
        self.db.add(db_course)
        self.db.commit()
        self.db.refresh(db_course)
        return db_course

    def update_course(self, course_id: int, course_data: CourseUpdate) -> Course | None:
        db_course = self.get_course_by_id(course_id)
        if not db_course:
            return None
        for key, value in course_data.model_dump(exclude_unset=True).items():
            setattr(db_course, key, value)
        self.db.commit()
        self.db.refresh(db_course)
        return db_course

    def delete_course(self, course_id: int) -> bool:
        db_course = self.get_course_by_id(course_id)
        if not db_course:
            return False
        for group in db_course.groups:
            group.course_id = None
        self.db.delete(db_course)
        self.db.commit()
        return True

    def get_course_module_by_id(self, module_id: int) -> CourseModule | None:
        return self.db.query(CourseModule).filter(CourseModule.id == module_id).first()

    def get_course_modules(self, skip: int = 0, limit: int = 100, course_id: int | None = None) -> list[CourseModule]:
        query = self.db.query(CourseModule)
        if course_id is not None:
            query = query.filter(CourseModule.course_id == course_id)
        return query.offset(skip).limit(limit).all()

    def create_course_module(self, module: CourseModuleCreate) -> CourseModule:
        db_module = CourseModule(
            title=module.title,
            module_number=module.module_number,
            course_id=module.course_id,
        )
        self.db.add(db_module)
        self.db.commit()
        self.db.refresh(db_module)
        return db_module

    def update_course_module(self, module_id: int, module_data: CourseModuleUpdate) -> CourseModule | None:
        db_module = self.get_course_module_by_id(module_id)
        if not db_module:
            return None
        for key, value in module_data.model_dump(exclude_unset=True).items():
            setattr(db_module, key, value)
        self.db.commit()
        self.db.refresh(db_module)
        return db_module

    def delete_course_module(self, module_id: int) -> bool:
        db_module = self.get_course_module_by_id(module_id)
        if not db_module:
            return False
        self.db.delete(db_module)
        self.db.commit()
        return True

    def get_course_lesson_by_id(self, lesson_id: int) -> CourseLesson | None:
        return self.db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()

    def get_course_lessons(
        self,
        skip: int = 0,
        limit: int = 100,
        course_id: int | None = None,
        module_id: int | None = None,
    ) -> list[CourseLesson]:
        query = self.db.query(CourseLesson)
        if course_id is not None:
            query = query.filter(CourseLesson.course_id == course_id)
        if module_id is not None:
            query = query.filter(CourseLesson.module_id == module_id)
        return query.offset(skip).limit(limit).all()

    def create_course_lesson(self, lesson: CourseLessonCreate) -> CourseLesson:
        db_lesson = CourseLesson(
            title=lesson.title,
            lesson_number=lesson.lesson_number,
            description=lesson.description,
            course_id=lesson.course_id,
            module_id=lesson.module_id,
        )
        self.db.add(db_lesson)
        self.db.commit()
        self.db.refresh(db_lesson)
        return db_lesson

    def update_course_lesson(self, lesson_id: int, lesson_data: CourseLessonUpdate) -> CourseLesson | None:
        db_lesson = self.get_course_lesson_by_id(lesson_id)
        if not db_lesson:
            return None
        for key, value in lesson_data.model_dump(exclude_unset=True).items():
            setattr(db_lesson, key, value)
        self.db.commit()
        self.db.refresh(db_lesson)
        return db_lesson

    def delete_course_lesson(self, lesson_id: int) -> bool:
        db_lesson = self.get_course_lesson_by_id(lesson_id)
        if not db_lesson:
            return False
        self.db.delete(db_lesson)
        self.db.commit()
        return True

    def get_course_material_by_id(self, material_id: int) -> CourseMaterial | None:
        return self.db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()

    def get_course_materials(
        self,
        skip: int = 0,
        limit: int = 100,
        course_id: int | None = None,
        lesson_id: int | None = None,
    ) -> list[CourseMaterial]:
        query = self.db.query(CourseMaterial)
        if course_id is not None:
            query = query.filter(CourseMaterial.course_id == course_id)
        if lesson_id is not None:
            query = query.filter(CourseMaterial.lesson_id == lesson_id)
        return query.offset(skip).limit(limit).all()

    def create_course_material(self, material: CourseMaterialCreate) -> CourseMaterial:
        db_material = CourseMaterial(
            homework_file=material.homework_file,
            homework_text=material.homework_text,
            course_id=material.course_id,
            lesson_id=material.lesson_id,
        )
        self.db.add(db_material)
        self.db.commit()
        self.db.refresh(db_material)
        return db_material

    def update_course_material(self, material_id: int, material_data: CourseMaterialUpdate) -> CourseMaterial | None:
        db_material = self.get_course_material_by_id(material_id)
        if not db_material:
            return None
        for key, value in material_data.model_dump(exclude_unset=True).items():
            setattr(db_material, key, value)
        self.db.commit()
        self.db.refresh(db_material)
        return db_material

    def delete_course_material(self, material_id: int) -> bool:
        db_material = self.get_course_material_by_id(material_id)
        if not db_material:
            return False
        self.db.delete(db_material)
        self.db.commit()
        return True
