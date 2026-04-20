from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portal import HomeworkSubmission, TestAttempt
from app.models.organization import User
from app.repositories import CourseRepository, GroupRepository, TeacherRepository
from app.utils.api_errors import forbidden, not_found
from app.utils.course_instances import ensure_course_instance
from app.utils.schedule import normalize_schedule_slots
from app.utils.serializers import (
    serialize_course,
    serialize_course_detail,
    serialize_homework_submission,
    serialize_student_brief,
    serialize_test_attempt,
)

from .auth import get_current_user

router = APIRouter(prefix="/teachers/me", tags=["teacher-portal"])


class HomeworkReviewRequest(BaseModel):
    status: str = "pending"
    feedback: str = ""


def _teacher_user_or_403(user: User) -> User:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role != "teacher" or user.teacher is None:
        raise forbidden("Teacher access required")
    return user


def _teacher_groups(db: Session, teacher_id: int):
    return GroupRepository(db).list(teacher_id=teacher_id)


def _teacher_group_or_404(db: Session, teacher_id: int, group_id: int):
    group = GroupRepository(db).get(group_id)
    if group is None or group.teacher_id != teacher_id:
        raise not_found("Group not found")
    return group


def _latest_homework_by_student(db: Session, student_ids: list[int], course_id: int, lesson_id: int) -> dict[int, HomeworkSubmission]:
    stmt = (
        select(HomeworkSubmission)
        .where(
            HomeworkSubmission.student_id.in_(student_ids),
            HomeworkSubmission.course_id == course_id,
            HomeworkSubmission.lesson_id == lesson_id,
        )
        .order_by(HomeworkSubmission.student_id, HomeworkSubmission.created_at.desc())
    )
    latest: dict[int, HomeworkSubmission] = {}
    for submission in db.scalars(stmt):
        latest.setdefault(submission.student_id, submission)
    return latest


def _latest_attempts_by_student(db: Session, student_ids: list[int], course_id: int, lesson_id: int) -> dict[int, TestAttempt]:
    stmt = (
        select(TestAttempt)
        .where(
            TestAttempt.student_id.in_(student_ids),
            TestAttempt.course_id == course_id,
            TestAttempt.lesson_id == lesson_id,
        )
        .order_by(TestAttempt.student_id, TestAttempt.created_at.desc())
    )
    latest: dict[int, TestAttempt] = {}
    for attempt in db.scalars(stmt):
        latest.setdefault(attempt.student_id, attempt)
    return latest


def _build_homework_stats(group, course_id: int, lesson_id: int, db: Session) -> dict:
    latest = _latest_homework_by_student(db, [student.id for student in group.students], course_id, lesson_id)
    submissions = list(latest.values())
    approved = len([item for item in submissions if item.status == "approved"])
    needs_revision = len([item for item in submissions if item.status == "needs_revision"])
    pending = len([item for item in submissions if item.status == "pending"])
    return {
        "total_students": len(group.students),
        "submitted_count": len(submissions),
        "checked_count": approved + needs_revision,
        "approved_count": approved,
        "needs_revision_count": needs_revision,
        "pending_count": pending,
    }


def _build_test_stats(group, course_id: int, lesson_id: int, db: Session) -> dict:
    latest = _latest_attempts_by_student(db, [student.id for student in group.students], course_id, lesson_id)
    attempts = list(latest.values())
    passed = len([item for item in attempts if item.total > 0 and item.score >= item.total])
    return {
        "total_students": len(group.students),
        "attempted_count": len(attempts),
        "passed_count": passed,
        "failed_count": len(attempts) - passed,
    }


@router.get("/groups")
def get_my_groups(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _teacher_user_or_403(current_user)
    course_repo = CourseRepository(db)
    items = []
    for group in _teacher_groups(db, user.teacher.id):
        instance_course = ensure_course_instance(group, course_repo) if group.template_course_id else None
        items.append(
            {
                "id": group.id,
                "group_number": group.group_number,
                "student_ids": [student.id for student in group.students],
                "students_count": len(group.students),
                "course_template": serialize_course(group.template_course, course_repo) if group.template_course else None,
                "course_instance": serialize_course(instance_course, course_repo) if instance_course else None,
                "has_course_instance": instance_course is not None,
            }
        )
    return {"data": items}


@router.get("/groups/{group_id}")
def get_my_group(
    group_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _teacher_user_or_403(current_user)
    group = _teacher_group_or_404(db, user.teacher.id, group_id)
    course_repo = CourseRepository(db)
    instance_course = ensure_course_instance(group, course_repo) if group.template_course_id else None
    instance_detail = serialize_course_detail(instance_course, course_repo) if instance_course else None
    if instance_course and instance_detail:
        instance_detail["lessons"] = [
            {
                **lesson,
                "homework_review": _build_homework_stats(group, instance_course.id, lesson["id"], db),
                "test_review": _build_test_stats(group, instance_course.id, lesson["id"], db),
            }
            for lesson in instance_detail["lessons"]
        ]

    return {
        "id": group.id,
        "group_number": group.group_number,
        "student_ids": [student.id for student in group.students],
        "students_count": len(group.students),
        "students": [serialize_student_brief(student) for student in group.students],
        "teacher": {
            "id": user.teacher.id,
            "first_name": user.teacher.first_name,
            "last_name": user.teacher.last_name,
        },
        "planned_start_date": group.planned_start_date,
        "planned_end_date": group.planned_end_date,
        "planned_schedule_slots": normalize_schedule_slots(group.planned_schedule_slots),
        "course_template": serialize_course(group.template_course, course_repo) if group.template_course else None,
        "course_instance": instance_detail,
    }


@router.get("/groups/{group_id}/lessons/{lesson_id}/homework-submissions")
def get_lesson_homework_submissions(
    group_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _teacher_user_or_403(current_user)
    group = _teacher_group_or_404(db, user.teacher.id, group_id)
    course_repo = CourseRepository(db)
    instance_course = ensure_course_instance(group, course_repo) if group.template_course_id else None
    if instance_course is None:
        raise not_found("Course not found")
    lesson = next((item for item in instance_course.lessons if item.id == lesson_id), None)
    if lesson is None:
        raise not_found("Lesson not found")

    latest = _latest_homework_by_student(db, [student.id for student in group.students], instance_course.id, lesson_id)
    return {
        "lesson": {
            "id": lesson.id,
            "title": lesson.title,
            "lesson_number": lesson.lesson_number,
        },
        "stats": _build_homework_stats(group, instance_course.id, lesson_id, db),
        "data": [
            {
                "student": serialize_student_brief(student),
                "submission": serialize_homework_submission(latest[student.id]) if student.id in latest else None,
            }
            for student in group.students
        ],
    }


@router.patch("/groups/{group_id}/lessons/{lesson_id}/homework-submissions/{submission_id}")
def review_homework_submission(
    group_id: int,
    lesson_id: int,
    submission_id: int,
    data: HomeworkReviewRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _teacher_user_or_403(current_user)
    group = _teacher_group_or_404(db, user.teacher.id, group_id)
    course_repo = CourseRepository(db)
    instance_course = ensure_course_instance(group, course_repo) if group.template_course_id else None
    if instance_course is None:
        raise not_found("Course not found")

    submission = db.get(HomeworkSubmission, submission_id)
    if (
        submission is None
        or submission.lesson_id != lesson_id
        or submission.course_id != instance_course.id
        or submission.student_id not in {student.id for student in group.students}
    ):
        raise not_found("Homework submission not found")

    next_status = data.status if data.status in {"pending", "approved", "needs_revision"} else "pending"
    submission.status = next_status
    submission.feedback = data.feedback.strip()
    if next_status == "pending":
        submission.checked_at = None
        submission.checked_by = None
    else:
        submission.checked_at = datetime.now(timezone.utc)
        submission.checked_by = user.teacher.id
    db.commit()
    db.refresh(submission)
    return serialize_homework_submission(submission)


@router.get("/groups/{group_id}/lessons/{lesson_id}/test-attempts")
def get_lesson_test_attempts(
    group_id: int,
    lesson_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _teacher_user_or_403(current_user)
    group = _teacher_group_or_404(db, user.teacher.id, group_id)
    course_repo = CourseRepository(db)
    instance_course = ensure_course_instance(group, course_repo) if group.template_course_id else None
    if instance_course is None:
        raise not_found("Course not found")
    lesson = next((item for item in instance_course.lessons if item.id == lesson_id), None)
    if lesson is None:
        raise not_found("Lesson not found")

    latest = _latest_attempts_by_student(db, [student.id for student in group.students], instance_course.id, lesson_id)
    return {
        "lesson": {
            "id": lesson.id,
            "title": lesson.title,
            "lesson_number": lesson.lesson_number,
        },
        "stats": _build_test_stats(group, instance_course.id, lesson_id, db),
        "data": [
            {
                "student": serialize_student_brief(student),
                "attempt": serialize_test_attempt(latest[student.id]) if student.id in latest else None,
            }
            for student in group.students
        ],
    }


@router.get("/preferences")
def get_my_preferences(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _teacher_user_or_403(current_user)
    course_repo = CourseRepository(db)
    courses = [
        course for course in course_repo.list(organization_id=user.organization_id)
        if course.kind != "instance"
    ]
    return {
        "teacher_id": user.teacher.id,
        "course_ids": list(user.teacher.course_ids or []),
        "schedule_preferences": normalize_schedule_slots(user.teacher.schedule_preferences),
        "available_courses": [
            {
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "selected": course.id in (user.teacher.course_ids or []),
            }
            for course in courses
        ],
    }


@router.put("/preferences")
def update_my_preferences(
    payload: dict,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    user = _teacher_user_or_403(current_user)
    repo = TeacherRepository(db)
    teacher = repo.update(
        user.teacher.id,
        course_ids=[int(value) for value in payload.get("course_ids") or []],
        course_ids_set=True,
        schedule_preferences=normalize_schedule_slots(payload.get("schedule_preferences")),
        schedule_preferences_set=True,
    )
    if teacher is None:
        raise not_found("Teacher not found")
    db.refresh(teacher)
    return {
        "teacher_id": teacher.id,
        "course_ids": list(teacher.course_ids or []),
        "schedule_preferences": normalize_schedule_slots(teacher.schedule_preferences),
        "available_courses": [
            {
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "selected": course.id in (teacher.course_ids or []),
            }
            for course in CourseRepository(db).list(organization_id=user.organization_id)
            if course.kind != "instance"
        ],
    }
