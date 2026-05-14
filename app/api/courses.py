from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File as FastAPIFile, Form, Response, UploadFile, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.organization import User
from ..schemas.courses import (
    CourseCreateRequest,
    CourseDetail,
    CourseLessonOut,
    CourseListItem,
    CourseModuleCreateRequest,
    CourseModuleOut,
    CourseModuleUpdateRequest,
    CoursesListResponse,
    CourseUpdateRequest,
    TestOut,
)
from ..services.courses import CourseAdminService
from .auth import get_current_user

router = APIRouter(prefix="/courses", tags=["courses"])


def _service(db: Session, current_user: User) -> CourseAdminService:
    return CourseAdminService(db, current_user)


@router.get("", response_model=CoursesListResponse)
def list_courses(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CoursesListResponse:
    return _service(db, current_user).list_courses()


@router.get("/{course_id}", response_model=CourseDetail)
def get_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseDetail:
    return _service(db, current_user).get_course(course_id)


@router.post("", response_model=CourseListItem, status_code=status.HTTP_201_CREATED)
def create_course(
    data: CourseCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseListItem:
    return _service(db, current_user).create_course(data)


@router.patch("/{course_id}", response_model=CourseListItem)
def update_course(
    course_id: int,
    data: CourseUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseListItem:
    return _service(db, current_user).update_course(course_id, data)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _service(db, current_user).delete_course(course_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{course_id}/modules", response_model=list[CourseModuleOut])
def list_course_modules(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CourseModuleOut]:
    return _service(db, current_user).list_modules(course_id)


@router.get("/{course_id}/modules/{module_id}", response_model=CourseModuleOut)
def get_course_module(
    course_id: int,
    module_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseModuleOut:
    return _service(db, current_user).get_module(course_id, module_id)


@router.post("/{course_id}/modules", response_model=CourseModuleOut, status_code=status.HTTP_201_CREATED)
def create_course_module(
    course_id: int,
    data: CourseModuleCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseModuleOut:
    return _service(db, current_user).create_module(course_id, data)


@router.patch("/{course_id}/modules/{module_id}", response_model=CourseModuleOut)
def update_course_module(
    course_id: int,
    module_id: int,
    data: CourseModuleUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseModuleOut:
    return _service(db, current_user).update_module(course_id, module_id, data)


@router.delete("/{course_id}/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_module(
    course_id: int,
    module_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _service(db, current_user).delete_module(course_id, module_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{course_id}/lessons", response_model=list[CourseLessonOut])
def list_course_lessons(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CourseLessonOut]:
    return _service(db, current_user).list_lessons(course_id)


@router.get("/{course_id}/lessons/{lesson_id}", response_model=CourseLessonOut)
def get_course_lesson(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseLessonOut:
    return _service(db, current_user).get_lesson(course_id, lesson_id)


@router.post("/{course_id}/lessons", response_model=CourseLessonOut, status_code=status.HTTP_201_CREATED)
def create_course_lesson(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    title: Annotated[str | None, Form()] = None,
    lesson_number: Annotated[int, Form()] = 1,
    description: Annotated[str | None, Form()] = None,
    homework_text: Annotated[str | None, Form()] = None,
    module_id_raw: Annotated[str | None, Form(alias="module_id")] = None,
    materials: Annotated[list[UploadFile] | None, FastAPIFile(alias="materials")] = None,
) -> CourseLessonOut:
    return _service(db, current_user).create_lesson(
        course_id=course_id,
        title=title,
        lesson_number=lesson_number,
        description=description,
        homework_text=homework_text,
        module_id_raw=module_id_raw,
        materials=materials,
    )


@router.patch("/{course_id}/lessons/{lesson_id}", response_model=CourseLessonOut)
def update_course_lesson(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    title: Annotated[str | None, Form()] = None,
    lesson_number_raw: Annotated[str | None, Form(alias="lesson_number")] = None,
    description: Annotated[str | None, Form()] = None,
    homework_text: Annotated[str | None, Form()] = None,
    module_id_raw: Annotated[str | None, Form(alias="module_id")] = None,
    removed_material_ids_raw: Annotated[list[str] | None, Form(alias="removed_material_ids")] = None,
    materials: Annotated[list[UploadFile] | None, FastAPIFile(alias="materials")] = None,
) -> CourseLessonOut:
    return _service(db, current_user).update_lesson(
        course_id=course_id,
        lesson_id=lesson_id,
        title=title,
        lesson_number_raw=lesson_number_raw,
        description=description,
        homework_text=homework_text,
        module_id_raw=module_id_raw,
        removed_material_ids_raw=removed_material_ids_raw,
        materials=materials,
    )


@router.delete("/{course_id}/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_lesson(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _service(db, current_user).delete_lesson(course_id, lesson_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{course_id}/lessons/{lesson_id}/test", response_model=TestOut)
def get_lesson_test(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TestOut:
    return _service(db, current_user).get_lesson_test(course_id, lesson_id)


@router.post("/{course_id}/lessons/{lesson_id}/test", response_model=TestOut, status_code=status.HTTP_201_CREATED)
def create_lesson_test(
    course_id: int,
    lesson_id: int,
    payload: dict[str, Any],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TestOut:
    return _service(db, current_user).create_lesson_test(course_id, lesson_id, payload)


@router.put("/{course_id}/lessons/{lesson_id}/test", response_model=TestOut)
def update_lesson_test(
    course_id: int,
    lesson_id: int,
    payload: dict[str, Any],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TestOut:
    return _service(db, current_user).update_lesson_test(course_id, lesson_id, payload)


@router.delete("/{course_id}/lessons/{lesson_id}/test", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson_test(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _service(db, current_user).delete_lesson_test(course_id, lesson_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
