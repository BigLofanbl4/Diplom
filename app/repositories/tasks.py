from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.organization import User
from app.models.tasks import Task

from .base import BaseRepository


class TaskRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list_for_organization(self, organization_id: int) -> list[Task]:
        stmt = (
            select(Task)
            .where(Task.organization_id == organization_id)
            .options(
                selectinload(Task.creator).selectinload(User.admin),
                selectinload(Task.creator).selectinload(User.manager),
                selectinload(Task.creator).selectinload(User.teacher),
                selectinload(Task.assignee).selectinload(User.admin),
                selectinload(Task.assignee).selectinload(User.manager),
                selectinload(Task.assignee).selectinload(User.teacher),
            )
            .order_by(Task.created_at.desc(), Task.id.desc())
        )
        return self.db.scalars(stmt).all()

    def list_for_assignee(self, organization_id: int, assignee_user_id: int) -> list[Task]:
        stmt = (
            select(Task)
            .where(Task.organization_id == organization_id, Task.assignee_user_id == assignee_user_id)
            .options(
                selectinload(Task.creator).selectinload(User.admin),
                selectinload(Task.creator).selectinload(User.manager),
                selectinload(Task.creator).selectinload(User.teacher),
                selectinload(Task.assignee).selectinload(User.admin),
                selectinload(Task.assignee).selectinload(User.manager),
                selectinload(Task.assignee).selectinload(User.teacher),
            )
            .order_by(Task.created_at.desc(), Task.id.desc())
        )
        return self.db.scalars(stmt).all()

    def get(self, task_id: int) -> Task | None:
        stmt = (
            select(Task)
            .where(Task.id == task_id)
            .options(
                selectinload(Task.creator).selectinload(User.admin),
                selectinload(Task.creator).selectinload(User.manager),
                selectinload(Task.creator).selectinload(User.teacher),
                selectinload(Task.assignee).selectinload(User.admin),
                selectinload(Task.assignee).selectinload(User.manager),
                selectinload(Task.assignee).selectinload(User.teacher),
            )
        )
        return self.db.scalar(stmt)

    def create(
        self,
        *,
        organization_id: int,
        creator_user_id: int,
        assignee_user_id: int | None,
        type: str,
        description: str,
        source: str | None = None,
        source_key: str | None = None,
        status: str = "new",
    ) -> Task:
        task = Task(
            organization_id=organization_id,
            creator_user_id=creator_user_id,
            assignee_user_id=assignee_user_id,
            type=type,
            description=description,
            source=source,
            source_key=source_key,
            status=status,
        )
        return self._save(task)

    def update_status(self, task: Task, status: str) -> Task:
        task.status = status
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task: Task) -> None:
        self.db.delete(task)
        self.db.commit()
