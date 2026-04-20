from __future__ import annotations

from app.models.courses import Course, CourseLesson, CourseModule, File, Question, Test
from app.models.managers import Manager
from app.models.organization import Admin, User
from app.models.portal import HomeworkSubmission, TestAttempt
from app.models.students import Student
from app.models.teachers import Teacher
from app.repositories import CourseRepository
from app.utils.course_instances import find_template_course


def serialize_file(file: File) -> dict:
    return {
        "id": file.id,
        "name": file.name,
        "size": file.size,
        "url": file.url,
    }


def serialize_module(module: CourseModule) -> dict:
    return {
        "id": module.id,
        "title": module.title,
        "module_number": module.module_number,
        "course_id": module.course_id,
    }


def serialize_question(question: Question) -> dict:
    options = [
        {
            "text": answer.text,
            "value": answer.text,
        }
        for answer in question.answers
    ]
    correct_answers = [answer.text for answer in question.answers if answer.is_right]
    return {
        "id": question.id,
        "number": question.number,
        "text": question.text,
        "type": question.type.type if question.type is not None else "text",
        "answer": correct_answers,
        "options": options if options else None,
    }


def serialize_test(test: Test) -> dict:
    questions = sorted(test.questions, key=lambda item: (item.number, item.id))
    return {
        "id": test.id,
        "title": test.title,
        "questions_number": len(questions),
        "questions": [serialize_question(question) for question in questions],
    }


def _extract_homework_text(lesson: CourseLesson) -> str | None:
    for material in lesson.materials:
        if material.homework_text:
            return material.homework_text
    return None


def serialize_lesson(lesson: CourseLesson) -> dict:
    files = [
        serialize_file(file)
        for material in sorted(lesson.materials, key=lambda item: item.id)
        for file in sorted(material.files, key=lambda item: item.id)
    ]
    return {
        "id": lesson.id,
        "title": lesson.title,
        "lesson_number": lesson.lesson_number,
        "description": lesson.description,
        "homework_text": _extract_homework_text(lesson),
        "course_id": lesson.course_id,
        "module_id": lesson.module_id,
        "test_id": lesson.test.id if lesson.test is not None else None,
        "materials": files,
    }


def serialize_course(course: Course, course_repo: CourseRepository | None = None) -> dict:
    template_course_id = course.template_course_id
    if template_course_id is None and course.kind != "instance":
        template_course_id = None
    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "kind": course.kind,
        "template_course_id": template_course_id,
        "group_id": course.group_id,
        "teacher_id": course.teacher_id,
        "max_modules_count": int(course.max_modules_count or 0),
    }


def serialize_course_detail(course: Course, course_repo: CourseRepository) -> dict:
    modules = sorted(course.modules, key=lambda item: (item.module_number, item.id))
    lessons = sorted(course.lessons, key=lambda item: (item.module_id or 0, item.lesson_number, item.id))
    template_course = find_template_course(course, course_repo)
    template_modules = sorted(template_course.modules, key=lambda item: (item.module_number, item.id)) if template_course else []
    template_lessons = (
        sorted(template_course.lessons, key=lambda item: (item.module_id or 0, item.lesson_number, item.id))
        if template_course
        else []
    )
    return {
        **serialize_course(course, course_repo),
        "template_course": (
            {
                "id": template_course.id,
                "title": template_course.title,
                "description": template_course.description,
                "max_modules_count": int(template_course.max_modules_count or 0),
            }
            if template_course
            else None
        ),
        "template_modules": [serialize_module(module) for module in template_modules],
        "template_lessons": [serialize_lesson(lesson) for lesson in template_lessons],
        "modules": [serialize_module(module) for module in modules],
        "lessons": [serialize_lesson(lesson) for lesson in lessons],
    }


def serialize_teacher_brief(teacher: Teacher | None) -> dict | None:
    if teacher is None:
        return None
    return {
        "id": teacher.id,
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
    }


def serialize_student_brief(student: Student | None) -> dict | None:
    if student is None:
        return None
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
    }


def serialize_manager(manager: Manager) -> dict:
    return {
        "id": manager.id,
        "first_name": manager.first_name,
        "last_name": manager.last_name,
        "phone": manager.phone,
        "login": manager.user.login if manager.user is not None else "",
    }


def serialize_homework_submission(submission: HomeworkSubmission) -> dict:
    return {
        "id": submission.id,
        "student_id": submission.student_id,
        "lesson_id": submission.lesson_id,
        "course_id": submission.course_id,
        "text": submission.text or "",
        "files": submission.files or [],
        "status": submission.status,
        "feedback": submission.feedback or "",
        "checked_at": submission.checked_at.isoformat() if submission.checked_at else None,
        "checked_by": submission.checked_by,
        "created_at": submission.created_at.isoformat(),
    }


def serialize_test_attempt(attempt: TestAttempt) -> dict:
    return {
        "id": attempt.id,
        "student_id": attempt.student_id,
        "lesson_id": attempt.lesson_id,
        "course_id": attempt.course_id,
        "test_id": attempt.test_id,
        "score": attempt.score,
        "total": attempt.total,
        "answers": attempt.answers or [],
        "created_at": attempt.created_at.isoformat(),
        "is_passed": attempt.total > 0 and attempt.score >= attempt.total,
    }


def serialize_current_user(user: User) -> dict:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    base = {
        "id": user.id,
        "login": user.login,
        "role": role,
        "organization_id": user.organization_id,
    }

    if user.admin is not None:
        return {
            **base,
            "id": user.admin.id,
            "first_name": user.admin.first_name,
            "last_name": user.admin.last_name,
        }
    if user.manager is not None:
        return {
            **base,
            "id": user.manager.id,
            "first_name": user.manager.first_name,
            "last_name": user.manager.last_name,
            "phone": user.manager.phone,
        }
    if user.teacher is not None:
        return {
            **base,
            "id": user.teacher.id,
            "first_name": user.teacher.first_name,
            "last_name": user.teacher.last_name,
            "phone": user.teacher.phone,
            "birth_date": user.teacher.birth_date,
            "is_ovz": user.teacher.is_ovz,
        }
    if user.student is not None:
        return {
            **base,
            "id": user.student.id,
            "first_name": user.student.first_name,
            "last_name": user.student.last_name,
            "phone": user.student.parent_phone,
            "birth_date": user.student.birth_date,
        }
    return base


def serialize_admin(admin: Admin) -> dict:
    return {
        "id": admin.id,
        "first_name": admin.first_name,
        "last_name": admin.last_name,
        "login": admin.user.login if admin.user is not None else "",
    }
