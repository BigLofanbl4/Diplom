from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File as FastAPIFile, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portal import HomeworkSubmission, TestAttempt
from app.models.organization import User
from app.repositories import CourseRepository, GroupRepository
from app.utils.api_errors import forbidden, not_found
from app.utils.course_instances import ensure_course_instance
from app.utils.file_storage import remove_stored_file, save_upload_file
from app.utils.serializers import (
    serialize_course_detail,
    serialize_homework_submission,
    serialize_test,
    serialize_test_attempt,
)

from .auth import get_current_user

router = APIRouter(prefix="/students/me", tags=["student-portal"])


def _student_user_or_403(user: User) -> User:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role != "student" or user.student is None:
        raise forbidden("Student access required")
    return user


def _student_course_context(db: Session, student_id: int, course_id: int):
    course_repo = CourseRepository(db)
    for group in GroupRepository(db).list():
        if not any(student.id == student_id for student in group.students):
            continue
        instance_course = ensure_course_instance(group, course_repo) if group.template_course_id else None
        if instance_course is not None and instance_course.id == course_id:
            return group, instance_course
    return None, None


def _normalize_answer(value):
    if isinstance(value, list):
        return sorted(str(item).strip().lower() for item in value if str(item).strip())
    if value is None:
        return []
    return [str(value).strip().lower()] if str(value).strip() else []


def _remove_submission_files(files: list[dict] | None) -> None:
    for file in files or []:
        remove_stored_file(file.get("path"))


def _save_submission_files(
    files: list[UploadFile] | None,
    *,
    student_id: int,
    lesson_id: int,
    submission_id: int,
) -> list[dict]:
    payload = []
    saved_paths: list[str] = []
    try:
        for upload in files or []:
            file_id = uuid4().hex
            stored_file = save_upload_file(
                upload,
                "homework-submissions",
                str(student_id),
                str(lesson_id),
                str(submission_id),
            )
            saved_paths.append(stored_file.relative_path)
            payload.append(
                {
                    "id": file_id,
                    "name": stored_file.original_name,
                    "size": stored_file.size,
                    "path": stored_file.relative_path,
                    "url": f"/api/v1/files/homework-submissions/{submission_id}/{file_id}",
                }
            )
    except Exception:
        for path in saved_paths:
            remove_stored_file(path)
        raise
    return payload


@router.get("/courses")
def get_my_courses(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _student_user_or_403(current_user)
    course_repo = CourseRepository(db)
    items = []
    for group in GroupRepository(db).list():
        if not any(student.id == user.student.id for student in group.students):
            continue
        instance_course = ensure_course_instance(group, course_repo) if group.template_course_id else None
        if instance_course is None:
            continue
        items.append(
            {
                "id": instance_course.id,
                "title": instance_course.title,
                "description": instance_course.description,
                "group": {
                    "id": group.id,
                    "group_number": group.group_number,
                },
                "modules_count": len(instance_course.modules),
                "lessons_count": len(instance_course.lessons),
            }
        )
    return {"data": items}


@router.get("/courses/{course_id}")
def get_my_course(
    course_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _student_user_or_403(current_user)
    _, course = _student_course_context(db, user.student.id, course_id)
    if course is None:
        raise not_found("Course not found")

    detail = serialize_course_detail(course, CourseRepository(db))
    submissions_stmt = select(HomeworkSubmission).where(
        HomeworkSubmission.student_id == user.student.id,
        HomeworkSubmission.course_id == course.id,
    )
    attempts_stmt = select(TestAttempt).where(
        TestAttempt.student_id == user.student.id,
        TestAttempt.course_id == course.id,
    )
    latest_submissions: dict[int, HomeworkSubmission] = {}
    for submission in db.scalars(submissions_stmt.order_by(HomeworkSubmission.created_at.desc())):
        latest_submissions.setdefault(submission.lesson_id, submission)
    latest_attempts: dict[int, TestAttempt] = {}
    for attempt in db.scalars(attempts_stmt.order_by(TestAttempt.created_at.desc())):
        latest_attempts.setdefault(attempt.lesson_id, attempt)

    detail["lessons"] = [
        {
            **lesson,
            "homework_submission": serialize_homework_submission(latest_submissions[lesson["id"]])
            if lesson["id"] in latest_submissions
            else None,
            "latest_test_attempt": serialize_test_attempt(latest_attempts[lesson["id"]])
            if lesson["id"] in latest_attempts
            else None,
        }
        for lesson in detail["lessons"]
    ]
    return detail


@router.get("/courses/{course_id}/lessons/{lesson_id}/test")
def get_my_lesson_test(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _student_user_or_403(current_user)
    _, course = _student_course_context(db, user.student.id, course_id)
    if course is None:
        raise not_found("Course not found")

    lesson = next((item for item in course.lessons if item.id == lesson_id), None)
    if lesson is None or lesson.test is None:
        raise not_found("Test not found")

    latest_attempt = db.scalars(
        select(TestAttempt)
        .where(
            TestAttempt.student_id == user.student.id,
            TestAttempt.course_id == course_id,
            TestAttempt.lesson_id == lesson_id,
        )
        .order_by(TestAttempt.created_at.desc())
    ).first()

    return {
        **serialize_test(lesson.test),
        "lesson_id": lesson_id,
        "course_id": course_id,
        "latest_attempt": serialize_test_attempt(latest_attempt) if latest_attempt else None,
    }


@router.post("/courses/{course_id}/lessons/{lesson_id}/test-attempts")
def submit_my_lesson_test(
    course_id: int,
    lesson_id: int,
    payload: dict,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _student_user_or_403(current_user)
    _, course = _student_course_context(db, user.student.id, course_id)
    if course is None:
        raise not_found("Course not found")
    lesson = next((item for item in course.lessons if item.id == lesson_id), None)
    if lesson is None or lesson.test is None:
        raise not_found("Test not found")

    answers_payload = payload.get("answers") or {}
    serialized_test = serialize_test(lesson.test)
    answers = []
    score = 0
    for question in serialized_test["questions"]:
        raw_value = answers_payload.get(str(question["id"])) if isinstance(answers_payload, dict) else None
        if raw_value is None and isinstance(answers_payload, dict):
            raw_value = answers_payload.get(question["id"])
        actual = _normalize_answer(raw_value)
        expected = _normalize_answer(question.get("answer") or [])
        is_correct = actual == expected
        if is_correct:
            score += 1
        answers.append(
            {
                "question_id": question["id"],
                "value": actual,
                "is_correct": is_correct,
            }
        )

    attempt = TestAttempt(
        student_id=user.student.id,
        lesson_id=lesson_id,
        course_id=course_id,
        test_id=lesson.test.id,
        score=score,
        total=len(serialized_test["questions"]),
        answers=answers,
        created_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return serialize_test_attempt(attempt)


@router.post("/courses/{course_id}/lessons/{lesson_id}/homework-submission")
def submit_my_homework(
    course_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    text: Annotated[str | None, Form()] = None,
    files: Annotated[list[UploadFile] | None, FastAPIFile(alias="files")] = None,
):
    user = _student_user_or_403(current_user)
    _, course = _student_course_context(db, user.student.id, course_id)
    if course is None:
        raise not_found("Course not found")
    lesson = next((item for item in course.lessons if item.id == lesson_id), None)
    if lesson is None:
        raise not_found("Lesson not found")

    submission = db.scalar(
        select(HomeworkSubmission).where(
            HomeworkSubmission.student_id == user.student.id,
            HomeworkSubmission.course_id == course_id,
            HomeworkSubmission.lesson_id == lesson_id,
        )
    )
    old_files = list(submission.files or []) if submission is not None else []
    created_submission = submission is None
    if submission is None:
        submission = HomeworkSubmission(
            student_id=user.student.id,
            lesson_id=lesson_id,
            course_id=course_id,
            text=text or "",
            files=[],
            status="pending",
            feedback="",
            created_at=datetime.now(timezone.utc),
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
    else:
        submission.text = text or ""
        submission.status = "pending"
        submission.feedback = ""
        submission.checked_at = None
        submission.checked_by = None
        submission.created_at = datetime.now(timezone.utc)

    file_payload: list[dict] = []
    try:
        file_payload = _save_submission_files(
            files,
            student_id=user.student.id,
            lesson_id=lesson_id,
            submission_id=submission.id,
        )
        submission.files = file_payload
        db.commit()
        db.refresh(submission)
    except Exception:
        _remove_submission_files(file_payload)
        if created_submission:
            db.rollback()
            db.delete(submission)
            db.commit()
        raise

    _remove_submission_files(old_files)
    return serialize_homework_submission(submission)
