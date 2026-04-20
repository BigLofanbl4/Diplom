from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, courses, groups, managers, organization, student_portal, students, teacher_portal, teachers
from app.config import settings
from app.database import init_db


app = FastAPI(title=settings.app_name)
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(teacher_portal.router, prefix=settings.api_v1_prefix)
app.include_router(student_portal.router, prefix=settings.api_v1_prefix)
app.include_router(teachers.router, prefix=settings.api_v1_prefix)
app.include_router(managers.router, prefix=settings.api_v1_prefix)
app.include_router(students.router, prefix=settings.api_v1_prefix)
app.include_router(groups.router, prefix=settings.api_v1_prefix)
app.include_router(courses.router, prefix=settings.api_v1_prefix)
app.include_router(organization.router, prefix=settings.api_v1_prefix)
