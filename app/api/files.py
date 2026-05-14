from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import User
from app.services.files import FileAccessService

from .auth import get_current_user

router = APIRouter(prefix="/files", tags=["files"])


def _service(db: Session, current_user: User) -> FileAccessService:
    return FileAccessService(db, current_user)


@router.get("/course-materials/{file_id}")
def download_course_material(
    file_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> FileResponse:
    return _service(db, current_user).download_course_material(file_id)


@router.get("/homework-submissions/{submission_id}/{file_id}")
def download_homework_submission_file(
    submission_id: int,
    file_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> FileResponse:
    return _service(db, current_user).download_homework_submission_file(submission_id, file_id)
