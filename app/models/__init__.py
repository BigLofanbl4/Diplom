from app.database import Base

from .organization import Admin, Organization
from .teachers import Teacher
from .courses import Course, CourseLesson, CourseMaterial, CourseModule, File
from .groups import Group, GroupLesson, group_students
from .students import Student, StudentHomework

__all__ = [
    "Base",
    "Admin",
    "Organization",
    "Teacher",
    "Course",
    "CourseModule",
    "CourseLesson",
    "CourseMaterial",
    "File",
    "Group",
    "GroupLesson",
    "group_students",
    "Student",
    "StudentHomework",
]
