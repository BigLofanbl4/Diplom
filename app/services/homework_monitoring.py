from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session
from sqlalchemy.exc import NoSuchTableError, OperationalError, ProgrammingError

from app.models.courses import Course
from app.models.organization import UserType
from app.models.portal import HomeworkSubmission
from app.models.tasks import Task
from app.models.teachers import Teacher
from app.repositories import CourseRepository, GroupRepository, TaskRepository, TeacherRepository, UserRepository
from app.utils.course_instances import ensure_course_instance

AUTO_TASK_SOURCE = "homework_monitoring"
AUTO_TASK_TYPE = "homework_monitoring"
MISSING_HOMEWORK_THRESHOLD = 5
PENDING_REVIEW_THRESHOLD = 20


@dataclass
class HomeworkMonitoringSummary:
    teacher_id: int
    teacher_user_id: int
    teacher_name: str
    groups_count: int
    lessons_count: int
    missing_homework_lessons_count: int
    pending_review_submissions_count: int
    pending_review_student_groups_count: int
    auto_task_reasons: list[str]
    has_active_auto_task: bool

    def to_dict(self) -> dict:
        return {
            "teacher_id": self.teacher_id,
            "teacher_user_id": self.teacher_user_id,
            "teacher_name": self.teacher_name,
            "groups_count": self.groups_count,
            "lessons_count": self.lessons_count,
            "missing_homework_lessons_count": self.missing_homework_lessons_count,
            "pending_review_submissions_count": self.pending_review_submissions_count,
            "pending_review_student_groups_count": self.pending_review_student_groups_count,
            "auto_task_reasons": list(self.auto_task_reasons),
            "has_active_auto_task": self.has_active_auto_task,
        }


def _teacher_name(teacher: Teacher) -> str:
    return " ".join(part for part in [teacher.last_name, teacher.first_name] if part).strip() or f"Teacher #{teacher.id}"


def _lesson_has_homework(lesson) -> bool:
    for material in lesson.materials or []:
        if isinstance(material.homework_text, str) and material.homework_text.strip():
            return True
    return False


def _auto_task_description(summary: HomeworkMonitoringSummary) -> str:
    reasons: list[str] = []
    if summary.missing_homework_lessons_count >= MISSING_HOMEWORK_THRESHOLD:
        reasons.append(f"не заполнено ДЗ на {summary.missing_homework_lessons_count} уроках")
    if summary.pending_review_student_groups_count >= PENDING_REVIEW_THRESHOLD:
        reasons.append(
            "не проверены ДЗ у "
            f"{summary.pending_review_student_groups_count} разных учеников в группах "
            f"({summary.pending_review_submissions_count} работ всего)"
        )
    joined_reasons = " и ".join(reasons)
    return (
        "Автоматическая задача по контролю ДЗ. "
        f"Сейчас {joined_reasons}. "
        "Пожалуйста, заполните домашние задания и/или завершите проверку работ."
    )


def _auto_task_key(summary: HomeworkMonitoringSummary) -> str:
    return f"teacher:{summary.teacher_user_id}"


def _auto_task_key_for_user(user_id: int) -> str:
    return f"teacher:{user_id}"


def _resolve_automation_creator_user_id(db: Session, organization_id: int) -> int | None:
    users = UserRepository(db).list(organization_id=organization_id)
    admins_or_managers = [
        user for user in users
        if user.role in {UserType.admin, UserType.manager}
    ]
    ordered = sorted(admins_or_managers or users, key=lambda item: item.id)
    return ordered[0].id if ordered else None


def _has_auto_task_columns(db: Session) -> bool:
    bind = db.get_bind()
    if bind is None:
        return False

    try:
        columns = inspect(bind).get_columns("tasks")
    except (NoSuchTableError, OperationalError, ProgrammingError):
        return False

    column_names = {column["name"] for column in columns}
    return {"source", "source_key"}.issubset(column_names)


def _active_auto_tasks_by_key(db: Session, organization_id: int) -> dict[str, Task]:
    if not _has_auto_task_columns(db):
        return {}

    stmt = (
        select(Task)
        .where(
            Task.organization_id == organization_id,
            Task.source == AUTO_TASK_SOURCE,
            Task.status != "done",
        )
        .order_by(Task.created_at.desc(), Task.id.desc())
    )
    active_tasks: dict[str, Task] = {}
    for task in db.scalars(stmt):
        if task.source_key:
            active_tasks.setdefault(task.source_key, task)
    return active_tasks


def _pending_submissions_by_teacher(
    db: Session,
    organization_id: int,
    *,
    teacher_id: int | None = None,
) -> dict[int, tuple[int, int]]:
    stmt = (
        select(HomeworkSubmission, Course)
        .join(Course, Course.id == HomeworkSubmission.course_id)
        .where(
            Course.organization_id == organization_id,
            Course.teacher_id.is_not(None),
            HomeworkSubmission.status == "pending",
        )
    )
    if teacher_id is not None:
        stmt = stmt.where(Course.teacher_id == teacher_id)
    grouped: dict[int, list[tuple[HomeworkSubmission, Course]]] = {}
    for submission, course in db.execute(stmt).all():
        if course.teacher_id is None:
            continue
        grouped.setdefault(course.teacher_id, []).append((submission, course))

    result: dict[int, tuple[int, int]] = {}
    for teacher_id, items in grouped.items():
        unique_student_groups = {
            (submission.student_id, course.group_id or course.id)
            for submission, course in items
        }
        result[teacher_id] = (len(items), len(unique_student_groups))
    return result


def _build_teacher_summary(
    db: Session,
    organization_id: int,
    teacher: Teacher,
    *,
    pending_by_teacher: dict[int, tuple[int, int]],
    active_auto_tasks: dict[str, Task],
) -> HomeworkMonitoringSummary:
    group_repo = GroupRepository(db)
    course_repo = CourseRepository(db)
    teacher_groups = group_repo.list(organization_id=organization_id, teacher_id=teacher.id)
    lessons_count = 0
    missing_homework_lessons_count = 0
    for group in teacher_groups:
        instance_course = ensure_course_instance(group, course_repo) if group.template_course_id else None
        if instance_course is None:
            continue
        lessons = sorted(instance_course.lessons, key=lambda item: (item.module_id or 0, item.lesson_number, item.id))
        lessons_count += len(lessons)
        missing_homework_lessons_count += sum(1 for lesson in lessons if not _lesson_has_homework(lesson))

    pending_submissions_count, pending_student_groups_count = pending_by_teacher.get(teacher.id, (0, 0))
    auto_task_reasons: list[str] = []
    if missing_homework_lessons_count >= MISSING_HOMEWORK_THRESHOLD:
        auto_task_reasons.append("missing_homework")
    if pending_student_groups_count >= PENDING_REVIEW_THRESHOLD:
        auto_task_reasons.append("pending_review")
    source_key = _auto_task_key_for_user(teacher.user_id)

    return HomeworkMonitoringSummary(
        teacher_id=teacher.id,
        teacher_user_id=teacher.user_id,
        teacher_name=_teacher_name(teacher),
        groups_count=len(teacher_groups),
        lessons_count=lessons_count,
        missing_homework_lessons_count=missing_homework_lessons_count,
        pending_review_submissions_count=pending_submissions_count,
        pending_review_student_groups_count=pending_student_groups_count,
        auto_task_reasons=auto_task_reasons,
        has_active_auto_task=source_key in active_auto_tasks,
    )


def build_homework_monitoring_summaries(
    db: Session,
    organization_id: int,
    *,
    teacher_id: int | None = None,
) -> list[HomeworkMonitoringSummary]:
    # Monitoring is often triggered in the same request that just created or updated
    # lessons/materials. Expire the session first so the recount reads the latest DB state
    # instead of stale relationship collections cached earlier in the request.
    db.expire_all()

    teacher_repo = TeacherRepository(db)
    if teacher_id is not None:
        teacher = teacher_repo.get(teacher_id)
        if teacher is None or teacher.user is None or teacher.user.organization_id != organization_id:
            return []
        teachers = [teacher]
    else:
        teachers = sorted(
            teacher_repo.list(organization_id=organization_id),
            key=lambda item: (item.last_name.lower(), item.first_name.lower(), item.id),
        )

    pending_by_teacher = _pending_submissions_by_teacher(db, organization_id, teacher_id=teacher_id)
    active_auto_tasks = _active_auto_tasks_by_key(db, organization_id)

    return [
        _build_teacher_summary(
            db,
            organization_id,
            teacher,
            pending_by_teacher=pending_by_teacher,
            active_auto_tasks=active_auto_tasks,
        )
        for teacher in teachers
    ]


def sync_homework_monitoring(
    db: Session,
    organization_id: int,
    *,
    teacher_id: int | None = None,
) -> list[HomeworkMonitoringSummary]:
    summaries = build_homework_monitoring_summaries(db, organization_id, teacher_id=teacher_id)
    if not _has_auto_task_columns(db):
        return summaries

    creator_user_id = _resolve_automation_creator_user_id(db, organization_id)
    if creator_user_id is None:
        return summaries

    repo = TaskRepository(db)
    active_auto_tasks = _active_auto_tasks_by_key(db, organization_id)
    for summary in summaries:
        if not summary.auto_task_reasons:
            continue
        source_key = _auto_task_key(summary)
        if source_key in active_auto_tasks:
            continue
        repo.create(
            organization_id=organization_id,
            creator_user_id=creator_user_id,
            assignee_user_id=summary.teacher_user_id,
            type=AUTO_TASK_TYPE,
            description=_auto_task_description(summary),
            source=AUTO_TASK_SOURCE,
            source_key=source_key,
        )
        summary.has_active_auto_task = True

    return summaries
