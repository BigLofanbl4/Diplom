from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.organization import User
from app.models.tasks import Task
from app.repositories import TaskRepository, TeacherRepository
from app.schemas.tasks import (
    TaskActor,
    TaskCreateRequest,
    TaskItem,
    TaskListResponse,
    TaskOption,
    TaskOptionsResponse,
    TaskStatusUpdateRequest,
    TeacherOption,
)
from app.services.homework_monitoring import sync_homework_monitoring
from app.utils.api_errors import forbidden, not_found

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


class TaskWorkflowService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
        self.repo = TaskRepository(db)

    def list_tasks(self) -> TaskListResponse:
        monitoring = None
        if self._is_admin_or_manager():
            monitoring = [item.to_dict() for item in sync_homework_monitoring(self.db, self.current_user.organization_id)]
            tasks = self.repo.list_for_organization(self.current_user.organization_id)
        elif self._is_teacher():
            tasks = self.repo.list_for_assignee(self.current_user.organization_id, self.current_user.id)
        else:
            raise forbidden()

        return TaskListResponse(
            data=[self._serialize_task(task) for task in tasks],
            monitoring=monitoring,
        )

    def task_options(self) -> TaskOptionsResponse:
        task_types = [
            TaskOption(value=task_type, label=TASK_TYPE_LABELS[task_type])
            for task_type in self._task_types_for_current_user()
        ]
        statuses = [
            TaskOption(value=status_value, label=TASK_STATUS_LABELS[status_value])
            for status_value in STATUS_OPTIONS
        ]
        teachers = self._teacher_options() if self._is_admin_or_manager() else []
        return TaskOptionsResponse(
            task_types=task_types,
            statuses=statuses,
            teachers=teachers,
            can_assign_teacher_tasks=self._is_admin_or_manager(),
        )

    def create_task(self, payload: TaskCreateRequest) -> TaskItem:
        allowed_types = self._task_types_for_current_user()
        if payload.type not in allowed_types:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимый тип задачи.")

        assignee_user_id = self._resolve_assignee_user_id(payload.type, payload.assignee_teacher_id)
        task = self.repo.create(
            organization_id=self.current_user.organization_id,
            creator_user_id=self.current_user.id,
            assignee_user_id=assignee_user_id,
            type=payload.type,
            description=payload.description.strip(),
        )
        reloaded = self.repo.get(task.id)
        if reloaded is None:
            raise not_found("Task not found")
        return self._serialize_task(reloaded)

    def update_task_status(self, task_id: int, payload: TaskStatusUpdateRequest) -> TaskItem:
        if payload.status not in STATUS_OPTIONS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимый статус.")

        task = self.repo.get(task_id)
        if task is None:
            raise not_found("Task not found")
        task = self._ensure_task_accessible(task)

        if not self._can_update_status(task):
            raise forbidden()

        updated_task = self.repo.update_status(task, payload.status)
        reloaded = self.repo.get(updated_task.id)
        if reloaded is None:
            raise not_found("Task not found")
        return self._serialize_task(reloaded)

    def delete_task(self, task_id: int) -> None:
        task = self.repo.get(task_id)
        if task is None:
            raise not_found("Task not found")
        task = self._ensure_task_accessible(task)

        if not self._can_delete_task(task):
            raise forbidden()

        self.repo.delete(task)

    def _role_name(self) -> str:
        role = self.current_user.role
        return role.value if hasattr(role, "value") else str(role)

    def _is_admin_or_manager(self) -> bool:
        return self._role_name() in {"admin", "manager"}

    def _is_teacher(self) -> bool:
        return self._role_name() == "teacher"

    def _ensure_task_accessible(self, task: Task) -> Task:
        if task.organization_id != self.current_user.organization_id:
            raise not_found("Task not found")
        if self._is_admin_or_manager():
            return task
        if self._is_teacher() and task.assignee_user_id == self.current_user.id:
            return task
        raise not_found("Task not found")

    def _serialize_actor(self, user: User) -> TaskActor:
        role = user.role.value if hasattr(user.role, "value") else str(user.role)
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

    def _can_update_status(self, task: Task) -> bool:
        if self._is_admin_or_manager():
            return True
        return self._is_teacher() and task.assignee_user_id == self.current_user.id

    def _can_delete_task(self, task: Task) -> bool:
        return self._is_admin_or_manager()

    def _serialize_task(self, task: Task) -> TaskItem:
        return TaskItem(
            id=task.id,
            type=task.type,
            type_label=TASK_TYPE_LABELS.get(task.type, task.type),
            description=task.description,
            status=task.status,
            status_label=TASK_STATUS_LABELS.get(task.status, task.status),
            created_at=task.created_at.isoformat(),
            updated_at=task.updated_at.isoformat(),
            creator=self._serialize_actor(task.creator),
            assignee=self._serialize_actor(task.assignee) if task.assignee is not None else None,
            can_update_status=self._can_update_status(task),
        )

    def _teacher_options(self) -> list[TeacherOption]:
        teachers = TeacherRepository(self.db).list(organization_id=self.current_user.organization_id)
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

    def _task_types_for_current_user(self) -> list[str]:
        if self._is_admin_or_manager():
            return list(ALL_TASK_TYPES)
        if self._is_teacher():
            return list(GENERAL_TASK_TYPES)
        raise forbidden()

    def _resolve_assignee_user_id(self, task_type: str, assignee_teacher_id: int | None) -> int | None:
        if self._is_teacher():
            return self.current_user.id

        if task_type in TEACHER_ONLY_TASK_TYPES:
            if assignee_teacher_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Для этой задачи нужно выбрать учителя.",
                )
            teacher = TeacherRepository(self.db).get(assignee_teacher_id)
            if (
                teacher is None
                or teacher.user is None
                or teacher.user.organization_id != self.current_user.organization_id
            ):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Учитель не найден.")
            return teacher.user_id

        return None
