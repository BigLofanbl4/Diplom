from ..api import organization, groups, courses, students, teachers, auth
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["api"])
router.include_router(organization.router)
router.include_router(groups.router)
router.include_router(courses.router)
router.include_router(students.router)
router.include_router(teachers.router)
router.include_router(auth.router)
