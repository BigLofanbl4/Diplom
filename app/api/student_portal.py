from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File as FastAPIFile, Form, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import User
from app.services.student_portal import StudentPortalService

from .auth import get_current_user

router = APIRouter(prefix="/students/me", tags=["student-portal"])


def _service(db: Session, current_user: User) -> StudentPortalService:
    return StudentPortalService(db, current_user)


@router.get("/courses")
def get_my_courses(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).get_my_courses()


@router.get("/courses/{course_id}")
def get_my_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).get_my_course(course_id)


@router.get("/courses/{course_id}/lessons/{lesson_id}/test")
def get_my_lesson_test(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).get_my_lesson_test(course_id, lesson_id)


@router.post("/courses/{course_id}/lessons/{lesson_id}/test-attempts")
def submit_my_lesson_test(
    course_id: int,
    lesson_id: int,
    payload: dict,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).submit_my_lesson_test(course_id, lesson_id, payload)


@router.post("/courses/{course_id}/lessons/{lesson_id}/homework-submission")
def submit_my_homework(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    text: Annotated[str | None, Form()] = None,
    files: Annotated[list[UploadFile] | None, FastAPIFile(alias="files")] = None,
):
    return _service(db, current_user).submit_my_homework(
        course_id=course_id,
        lesson_id=lesson_id,
        text=text,
        files=files,
    )
