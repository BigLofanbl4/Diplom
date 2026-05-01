from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import User
from app.repositories import TaskRepository, TeacherRepository
from app.services.homework_monitoring import sync_homework_monitoring
from app.utils.api_errors import forbidden, not_found
from .auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])

GENERAL_TASK_TYPES = (
    "contact_parents",
    "technical_issue",
    "lesson_reschedule",
    "lesson_substitution",
    "payment_check",
    "schedule_extra_lesson",
    "other",
)
TEACHER_ONLY_TASK_TYPES = (
    "check_homework",
    "check_tests",
)
ALL_TASK_TYPES = GENERAL_TASK_TYPES + TEACHER_ONLY_TASK_TYPES
STATUS_OPTIONS = ("new", "in_progress", "done")

TASK_TYPE_LABELS = {
    "contact_parents": "Связаться с родителями",
    "technical_issue": "Техническая проблема",
    "lesson_reschedule": "Перенос занятия",
    "lesson_substitution": "Замена на занятие",
    "payment_check": "Проверка оплаты",
    "schedule_extra_lesson": "Назначить доп занятие",
    "other": "Другое",
    "check_homework": "Проверить дз",
    "check_tests": "Проверить тесты",
    "homework_monitoring": "Контроль ДЗ",
}
TASK_STATUS_LABELS = {
    "new": "Новая",
    "in_progress": "Принято в работу",
    "done": "Выполнено",
}


class TaskActor(BaseModel):
    id: int
    role: str
    first_name: str
    last_name: str
    display_name: str
    model_config = ConfigDict(from_attributes=True)


class TaskItem(BaseModel):
    id: int
    type: str
    type_label: str
    description: str
    status: str
    status_label: str
    created_at: str
    updated_at: str
    creator: TaskActor
    assignee: TaskActor | None = None
    can_update_status: bool
    model_config = ConfigDict(from_attributes=True)


class TaskOption(BaseModel):
    value: str
    label: str


class TeacherOption(BaseModel):
    id: int
    first_name: str
    last_name: str
    display_name: str


class TaskListResponse(BaseModel):
    data: list[TaskItem]
    monitoring: list[dict] | None = None


class TaskOptionsResponse(BaseModel):
    task_types: list[TaskOption]
    statuses: list[TaskOption]
    teachers: list[TeacherOption]
    can_assign_teacher_tasks: bool


class TaskCreateRequest(BaseModel):
    type: str = Field(min_length=1)
    description: str = Field(min_length=1)
    assignee_teacher_id: int | None = None


class TaskStatusUpdateRequest(BaseModel):
    status: str


def _role_name(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _is_admin_or_manager(user: User) -> bool:
    return _role_name(user) in {"admin", "manager"}


def _is_teacher(user: User) -> bool:
    return _role_name(user) == "teacher"


def _ensure_task_accessible(task, user: User):
    if task.organization_id != user.organization_id:
        raise not_found("Task not found")
    if _is_admin_or_manager(user):
        return task
    if _is_teacher(user) and task.assignee_user_id == user.id:
        return task
    raise not_found("Task not found")


def _serialize_actor(user: User) -> TaskActor:
    role = _role_name(user)
    profile = user.admin or user.manager or user.teacher or user.student
    first_name = getattr(profile, "first_name", "") or ""
    last_name = getattr(profile, "last_name", "") or ""
    display_name = " ".join(part for part in [last_name, first_name] if part).strip() or user.login
    return TaskActor(
        id=profile.id if profile is not None else user.id,
        role=role,
        first_name=first_name,
        last_name=last_name,
        display_name=display_name,
    )


def _can_update_status(task, user: User) -> bool:
    if _is_admin_or_manager(user):
        return True
    return _is_teacher(user) and task.assignee_user_id == user.id


def _can_delete_task(task, user: User) -> bool:
    return _is_admin_or_manager(user)


def _serialize_task(task, current_user: User) -> TaskItem:
    return TaskItem(
        id=task.id,
        type=task.type,
        type_label=TASK_TYPE_LABELS.get(task.type, task.type),
        description=task.description,
        status=task.status,
        status_label=TASK_STATUS_LABELS.get(task.status, task.status),
        created_at=task.created_at.isoformat(),
        updated_at=task.updated_at.isoformat(),
        creator=_serialize_actor(task.creator),
        assignee=_serialize_actor(task.assignee) if task.assignee is not None else None,
        can_update_status=_can_update_status(task, current_user),
    )


def _teacher_options(db: Session, user: User) -> list[TeacherOption]:
    teachers = TeacherRepository(db).list(organization_id=user.organization_id)
    teachers = sorted(teachers, key=lambda item: (item.last_name.lower(), item.first_name.lower(), item.id))
    return [
        TeacherOption(
            id=teacher.id,
            first_name=teacher.first_name,
            last_name=teacher.last_name,
            display_name=f"{teacher.last_name} {teacher.first_name}".strip(),
        )
        for teacher in teachers
    ]


def _task_types_for_user(user: User) -> list[str]:
    if _is_admin_or_manager(user):
        return list(ALL_TASK_TYPES)
    if _is_teacher(user):
        return list(GENERAL_TASK_TYPES)
    raise forbidden()


def _resolve_assignee_user_id(
    db: Session,
    user: User,
    task_type: str,
    assignee_teacher_id: int | None,
) -> int | None:
    if _is_teacher(user):
        return user.id

    if task_type in TEACHER_ONLY_TASK_TYPES:
        if assignee_teacher_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Для этой задачи нужно выбрать учителя.",
            )
        teacher = TeacherRepository(db).get(assignee_teacher_id)
        if teacher is None or teacher.user is None or teacher.user.organization_id != user.organization_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Учитель не найден.")
        return teacher.user_id

    return None


@router.get("", response_model=TaskListResponse)
def list_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskListResponse:
    repo = TaskRepository(db)
    monitoring = None
    if _is_admin_or_manager(current_user):
        monitoring = [item.to_dict() for item in sync_homework_monitoring(db, current_user.organization_id)]
        tasks = repo.list_for_organization(current_user.organization_id)
    elif _is_teacher(current_user):
        tasks = repo.list_for_assignee(current_user.organization_id, current_user.id)
    else:
        raise forbidden()

    return TaskListResponse(
        data=[_serialize_task(task, current_user) for task in tasks],
        monitoring=monitoring,
    )


@router.get("/options", response_model=TaskOptionsResponse)
def task_options(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskOptionsResponse:
    task_types = [
        TaskOption(value=task_type, label=TASK_TYPE_LABELS[task_type])
        for task_type in _task_types_for_user(current_user)
    ]
    statuses = [
        TaskOption(value=status_value, label=TASK_STATUS_LABELS[status_value])
        for status_value in STATUS_OPTIONS
    ]
    teachers = _teacher_options(db, current_user) if _is_admin_or_manager(current_user) else []
    return TaskOptionsResponse(
        task_types=task_types,
        statuses=statuses,
        teachers=teachers,
        can_assign_teacher_tasks=_is_admin_or_manager(current_user),
    )


@router.post("", response_model=TaskItem, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskItem:
    allowed_types = _task_types_for_user(current_user)
    if payload.type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимый тип задачи.")

    assignee_user_id = _resolve_assignee_user_id(db, current_user, payload.type, payload.assignee_teacher_id)
    task = TaskRepository(db).create(
        organization_id=current_user.organization_id,
        creator_user_id=current_user.id,
        assignee_user_id=assignee_user_id,
        type=payload.type,
        description=payload.description.strip(),
    )
    task = TaskRepository(db).get(task.id)
    return _serialize_task(task, current_user)


@router.patch("/{task_id}", response_model=TaskItem)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskItem:
    if payload.status not in STATUS_OPTIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимый статус.")

    repo = TaskRepository(db)
    task = repo.get(task_id)
    if task is None:
        raise not_found("Task not found")
    task = _ensure_task_accessible(task, current_user)

    if not _can_update_status(task, current_user):
        raise forbidden()

    updated_task = repo.update_status(task, payload.status)
    updated_task = repo.get(updated_task.id)
    return _serialize_task(updated_task, current_user)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    repo = TaskRepository(db)
    task = repo.get(task_id)
    if task is None:
        raise not_found("Task not found")
    task = _ensure_task_accessible(task, current_user)

    if not _can_delete_task(task, current_user):
        raise forbidden()

    repo.delete(task)
