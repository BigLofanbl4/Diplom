from typing import Union
from ..routers import organization, groups, courses, students, teachers
from fastapi import APIRouter

app = APIRouter(prefix="/api/v1", tags=["api"])
app.include_router(organization.router)
app.include_router(groups.router)
app.include_router(courses.router)
app.include_router(students.router)
app.include_router(teachers.router)

