from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import User
from app.schemas.tasks import (
    TaskCreateRequest,
    TaskItem,
    TaskListResponse,
    TaskOptionsResponse,
    TaskStatusUpdateRequest,
)
from app.services.tasks import TaskWorkflowService
from .auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _service(db: Session, current_user: User) -> TaskWorkflowService:
    return TaskWorkflowService(db, current_user)


@router.get("", response_model=TaskListResponse)
def list_tasks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskListResponse:
    return _service(db, current_user).list_tasks()


@router.get("/options", response_model=TaskOptionsResponse)
def task_options(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskOptionsResponse:
    return _service(db, current_user).task_options()


@router.post("", response_model=TaskItem, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskItem:
    return _service(db, current_user).create_task(payload)


@router.patch("/{task_id}", response_model=TaskItem)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TaskItem:
    return _service(db, current_user).update_task_status(task_id, payload)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    _service(db, current_user).delete_task(task_id)
