from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories import CourseRepository
from app.schemas import (
    CourseCreate,
    CourseMaterialCreate,
    CourseMaterialUpdate,
    CourseModuleCreate,
    CourseModuleUpdate,
    CourseUpdate,
)
from app.schemas.courses import CourseLessonCreate, CourseLessonUpdate

router = APIRouter(tags=["courses"])


def _material_url(material_id: int) -> str:
    return f"/api/v1/course-materials/{material_id}"


def _serialize_course_material(db_material):
    return {
        "id": db_material.id,
        "homework_file": db_material.homework_file,
        "homework_text": db_material.homework_text,
        "course_id": db_material.course_id,
        "lesson_id": db_material.lesson_id,
        "url": _material_url(db_material.id),
    }


def _serialize_lesson_with_materials(db_lesson):
    return {
        "id": db_lesson.id,
        "title": db_lesson.title,
        "lesson_number": db_lesson.lesson_number,
        "description": db_lesson.description,
        "course_id": db_lesson.course_id,
        "module_id": db_lesson.module_id,
        "materials": [
            {
                "id": material.id,
                "name": material.homework_file,
                "size": None,
                "lastModified": None,
                "url": _material_url(material.id),
            }
            for material in db_lesson.materials
        ],
    }


def _serialize_course_detail(db_course):
    modules = sorted(db_course.modules or [], key=lambda m: m.module_number)
    lessons = sorted(db_course.lessons or [], key=lambda l: l.lesson_number)

    return {
        "id": db_course.id,
        "title": db_course.title,
        "description": db_course.description,
        "modules": [
            {
                "id": module.id,
                "title": module.title,
                "module_number": module.module_number,
                "course_id": module.course_id,
            }
            for module in modules
        ],
        "lessons": [
            {
                "id": lesson.id,
                "title": lesson.title,
                "lesson_number": lesson.lesson_number,
                "description": lesson.description,
                "course_id": lesson.course_id,
                "module_id": lesson.module_id,
            }
            for lesson in lessons
        ],
    }


@router.get("/courses")
def read_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return CourseRepository(db).get_courses(skip, limit)


@router.get("/courses/{course_id}")
def read_course(course_id: int, db: Session = Depends(get_db)):
    db_course = CourseRepository(db).get_course_by_id(course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return _serialize_course_detail(db_course)


@router.post("/courses")
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    return CourseRepository(db).create_course(course)


@router.patch("/courses/{course_id}")
def update_course(course_id: int, course_data: CourseUpdate, db: Session = Depends(get_db)):
    db_course = CourseRepository(db).update_course(course_id, course_data)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course


@router.delete("/courses/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    success = CourseRepository(db).delete_course(course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course not found")
    return None


@router.get("/course-modules")
def read_course_modules(
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    db: Session = Depends(get_db),
):
    return CourseRepository(db).get_course_modules(skip, limit, course_id)


@router.get("/course-modules/{module_id}")
def read_course_module(module_id: int, db: Session = Depends(get_db)):
    db_module = CourseRepository(db).get_course_module_by_id(module_id)
    if not db_module:
        raise HTTPException(status_code=404, detail="Course module not found")
    return db_module


@router.post("/course-modules")
def create_course_module(module: CourseModuleCreate, db: Session = Depends(get_db)):
    return CourseRepository(db).create_course_module(module)


@router.patch("/course-modules/{module_id}")
def update_course_module(module_id: int, module_data: CourseModuleUpdate, db: Session = Depends(get_db)):
    db_module = CourseRepository(db).update_course_module(module_id, module_data)
    if not db_module:
        raise HTTPException(status_code=404, detail="Course module not found")
    return db_module


@router.delete("/course-modules/{module_id}", status_code=204)
def delete_course_module(module_id: int, db: Session = Depends(get_db)):
    success = CourseRepository(db).delete_course_module(module_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course module not found")
    return None


@router.get("/course-lessons")
def read_course_lessons(
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    module_id: int | None = None,
    db: Session = Depends(get_db),
):
    return CourseRepository(db).get_course_lessons(skip, limit, course_id, module_id)


@router.get("/course-lessons/{lesson_id}")
def read_course_lesson(lesson_id: int, db: Session = Depends(get_db)):
    db_lesson = CourseRepository(db).get_course_lesson_by_id(lesson_id)
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    return _serialize_lesson_with_materials(db_lesson)


@router.post("/course-lessons")
def create_course_lesson(
    title: str = Form(...),
    lesson_number: int = Form(...),
    description: Optional[str] = Form(None),
    course_id: int = Form(...),
    module_id: Optional[int] = Form(None),
    materials: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(get_db),
):
    repository = CourseRepository(db)
    lesson = CourseLessonCreate(
        title=title,
        lesson_number=lesson_number,
        description=description,
        course_id=course_id,
        module_id=module_id,
    )
    db_lesson = repository.create_course_lesson(lesson)

    for upload in materials or []:
        if not upload or not upload.filename:
            continue
        repository.create_course_material(
            CourseMaterialCreate(
                homework_file=upload.filename,
                homework_text=None,
                course_id=db_lesson.course_id,
                lesson_id=db_lesson.id,
            )
        )

    db.refresh(db_lesson)
    return _serialize_lesson_with_materials(db_lesson)


@router.patch("/course-lessons/{lesson_id}")
def update_course_lesson(
    lesson_id: int,
    title: Optional[str] = Form(None),
    lesson_number: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    course_id: Optional[int] = Form(None),
    module_id: Optional[int] = Form(None),
    removed_material_ids: Optional[list[int]] = Form(None),
    materials: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(get_db),
):
    repository = CourseRepository(db)
    update_payload = {}
    if title is not None:
        update_payload["title"] = title
    if lesson_number is not None:
        update_payload["lesson_number"] = lesson_number
    if description is not None:
        update_payload["description"] = description
    if course_id is not None:
        update_payload["course_id"] = course_id
    if module_id is not None:
        update_payload["module_id"] = module_id

    lesson_data = CourseLessonUpdate(**update_payload)
    db_lesson = repository.update_course_lesson(lesson_id, lesson_data)
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Course lesson not found")

    for material_id in removed_material_ids or []:
        db_material = repository.get_course_material_by_id(material_id)
        if not db_material or db_material.lesson_id != db_lesson.id:
            continue
        repository.delete_course_material(material_id)

    for upload in materials or []:
        if not upload or not upload.filename:
            continue
        repository.create_course_material(
            CourseMaterialCreate(
                homework_file=upload.filename,
                homework_text=None,
                course_id=db_lesson.course_id,
                lesson_id=db_lesson.id,
            )
        )

    db.refresh(db_lesson)
    return _serialize_lesson_with_materials(db_lesson)


@router.delete("/course-lessons/{lesson_id}", status_code=204)
def delete_course_lesson(lesson_id: int, db: Session = Depends(get_db)):
    success = CourseRepository(db).delete_course_lesson(lesson_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    return None


@router.get("/course-materials")
def read_course_materials(
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    lesson_id: int | None = None,
    db: Session = Depends(get_db),
):
    db_materials = CourseRepository(db).get_course_materials(skip, limit, course_id, lesson_id)
    return [_serialize_course_material(material) for material in db_materials]


@router.get("/course-materials/{material_id}")
def read_course_material(material_id: int, db: Session = Depends(get_db)):
    db_material = CourseRepository(db).get_course_material_by_id(material_id)
    if not db_material:
        raise HTTPException(status_code=404, detail="Course material not found")
    return _serialize_course_material(db_material)


@router.post("/course-materials")
def create_course_material(material: CourseMaterialCreate, db: Session = Depends(get_db)):
    db_material = CourseRepository(db).create_course_material(material)
    return _serialize_course_material(db_material)


@router.patch("/course-materials/{material_id}")
def update_course_material(material_id: int, material_data: CourseMaterialUpdate, db: Session = Depends(get_db)):
    db_material = CourseRepository(db).update_course_material(material_id, material_data)
    if not db_material:
        raise HTTPException(status_code=404, detail="Course material not found")
    return _serialize_course_material(db_material)


@router.delete("/course-materials/{material_id}", status_code=204)
def delete_course_material(material_id: int, db: Session = Depends(get_db)):
    success = CourseRepository(db).delete_course_material(material_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course material not found")
    return None
