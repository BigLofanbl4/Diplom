from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import User
from app.schemas.teacher_portal import HomeworkReviewRequest
from app.services.teacher_portal import TeacherPortalService

from .auth import get_current_user

router = APIRouter(prefix="/teachers/me", tags=["teacher-portal"])


def _service(db: Session, current_user: User) -> TeacherPortalService:
    return TeacherPortalService(db, current_user)


@router.get("/groups")
def get_my_groups(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).get_my_groups()


@router.get("/groups/{group_id}")
def get_my_group(
    group_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).get_my_group(group_id)


@router.get("/groups/{group_id}/lessons/{lesson_id}/homework-submissions")
def get_lesson_homework_submissions(
    group_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).get_lesson_homework_submissions(group_id, lesson_id)


@router.patch("/groups/{group_id}/lessons/{lesson_id}/homework-submissions/{submission_id}")
def review_homework_submission(
    group_id: int,
    lesson_id: int,
    submission_id: int,
    data: HomeworkReviewRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).review_homework_submission(
        group_id=group_id,
        lesson_id=lesson_id,
        submission_id=submission_id,
        data=data,
    )


@router.get("/groups/{group_id}/lessons/{lesson_id}/test-attempts")
def get_lesson_test_attempts(
    group_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).get_lesson_test_attempts(group_id, lesson_id)


@router.get("/preferences")
def get_my_preferences(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).get_my_preferences()


@router.put("/preferences")
def update_my_preferences(
    payload: dict,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return _service(db, current_user).update_my_preferences(payload)
