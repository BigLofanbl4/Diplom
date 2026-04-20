from __future__ import annotations

from app.models.courses import Course, CourseLesson, CourseModule, Test
from app.models.groups import Group
from app.repositories import CourseRepository, TestRepository


def is_instance_course(course: Course | None) -> bool:
    return bool(course and course.kind == "instance")


def get_template_course(course: Course | None) -> Course | None:
    if course is None:
        return None
    return course if course.kind != "instance" else None


def find_template_course(base_course: Course | None, repo: CourseRepository) -> Course | None:
    if base_course is None:
        return None
    if base_course.kind != "instance":
        return base_course
    if base_course.template_course_id is None:
        return None
    return repo.get(base_course.template_course_id)


def get_template_module_limit(course: Course | None, repo: CourseRepository) -> int:
    template_course = find_template_course(course, repo) if course is not None else None
    if template_course is None:
        return 0
    if int(template_course.max_modules_count or 0) > 0:
        return int(template_course.max_modules_count)
    return max((module.module_number for module in template_course.modules), default=0)


def ensure_course_instance(group: Group, repo: CourseRepository) -> Course | None:
    existing = repo.get_instance_by_group_id(group.id)
    if existing is not None:
        if existing.teacher_id != group.teacher_id:
            repo.update(existing.id, teacher_id=group.teacher_id, teacher_id_set=True)
            return repo.get(existing.id)
        return existing

    if group.template_course is None:
        return None

    instance = repo.create(
        title=f"{group.template_course.title} · Группа {group.group_number}",
        description=group.template_course.description,
        organization_id=group.organization_id,
        kind="instance",
        template_course_id=group.template_course.id,
        group_id=group.id,
        teacher_id=group.teacher_id,
        max_modules_count=get_template_module_limit(group.template_course, repo),
    )
    return repo.get(instance.id)


def find_template_module(course: Course, module_number: int, repo: CourseRepository) -> CourseModule | None:
    template_course = find_template_course(course, repo)
    if template_course is None:
        return None
    return next((module for module in template_course.modules if module.module_number == module_number), None)


def find_template_lesson(course: Course, module_number: int, lesson_number: int, repo: CourseRepository) -> CourseLesson | None:
    template_module = find_template_module(course, module_number, repo)
    if template_module is None:
        return None
    return next(
        (
            lesson
            for lesson in template_module.lessons
            if lesson.lesson_number == lesson_number
        ),
        None,
    )


def clone_template_test(source_test: Test, target_course_id: int, target_lesson_id: int, test_repo: TestRepository) -> Test:
    cloned = test_repo.create(course_id=target_course_id, title=source_test.title, lesson_id=target_lesson_id)
    questions_payload = []
    for question in sorted(source_test.questions, key=lambda item: (item.number, item.id)):
        questions_payload.append(
            {
                "front_id": question.front_id,
                "number": question.number,
                "text": question.text,
                "type_id": question.type_id,
                "answers": [
                    {
                        "text": answer.text,
                        "is_right": answer.is_right,
                    }
                    for answer in question.answers
                ],
            }
        )
    updated = test_repo.update(cloned.id, questions=questions_payload)
    return updated or cloned
