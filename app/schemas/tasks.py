from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


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
