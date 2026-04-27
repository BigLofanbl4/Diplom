from __future__ import annotations

import mimetypes
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.courses import Course, File as CourseFile
from app.models.groups import Group
from app.models.organization import User
from app.models.portal import HomeworkSubmission
from app.utils.api_errors import forbidden, not_found
from app.utils.file_storage import resolve_stored_path

from .auth import get_current_user

router = APIRouter(prefix="/files", tags=["files"])


def _role(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _student_in_group(group: Group | None, student_id: int | None) -> bool:
    if group is None or student_id is None:
        return False
    return any(student.id == student_id for student in group.students)


def _can_access_course_file(course: Course, user: User, db: Session) -> bool:
    if course.organization_id != user.organization_id:
        return False

    role = _role(user)
    if role in {"admin", "manager"}:
        return True
    if role == "teacher" and user.teacher is not None:
        return course.teacher_id == user.teacher.id
    if role == "student" and user.student is not None and course.group_id is not None:
        return _student_in_group(db.get(Group, course.group_id), user.student.id)
    return False


def _can_access_homework_submission(submission: HomeworkSubmission, user: User, db: Session) -> bool:
    course = submission.course
    if course.organization_id != user.organization_id:
        return False

    role = _role(user)
    if role in {"admin", "manager"}:
        return True
    if role == "student" and user.student is not None:
        return submission.student_id == user.student.id
    if role == "teacher" and user.teacher is not None:
        if course.teacher_id == user.teacher.id:
            return True
        if course.group_id is None:
            return False
        group = db.get(Group, course.group_id)
        return bool(group and group.teacher_id == user.teacher.id and _student_in_group(group, submission.student_id))
    return False


def _file_response(relative_path: str | None, filename: str) -> FileResponse:
    path = resolve_stored_path(relative_path)
    media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    return FileResponse(path=path, media_type=media_type, filename=filename)


@router.get("/course-materials/{file_id}")
def download_course_material(
    file_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> FileResponse:
    file = db.get(CourseFile, file_id)
    if file is None or file.material is None or file.material.course is None:
        raise not_found("File not found")
    if not _can_access_course_file(file.material.course, current_user, db):
        raise forbidden()
    return _file_response(file.path, file.name)


@router.get("/homework-submissions/{submission_id}/{file_id}")
def download_homework_submission_file(
    submission_id: int,
    file_id: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> FileResponse:
    submission = db.get(HomeworkSubmission, submission_id)
    if submission is None:
        raise not_found("File not found")
    if not _can_access_homework_submission(submission, current_user, db):
        raise forbidden()

    file_data = next(
        (file for file in submission.files or [] if str(file.get("id")) == str(file_id)),
        None,
    )
    if file_data is None:
        raise not_found("File not found")
    return _file_response(file_data.get("path"), file_data.get("name") or "file")
