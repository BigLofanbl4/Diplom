from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models.courses import Course
from app.models.groups import Group
from app.repositories import (
    CourseLessonRepository,
    CourseMaterialRepository,
    CourseModuleRepository,
    CourseRepository,
    FileRepository,
    GroupRepository,
    ManagerRepository,
    OrganizationRepository,
    QuestionTypeRepository,
    StudentRepository,
    TeacherRepository,
    TestRepository,
)
from app.repositories.organization import AdminRepository, UserRepository


def bootstrap_default_data(db: Session) -> None:
    if UserRepository(db).list():
        return

    org_repo = OrganizationRepository(db)
    admin_repo = AdminRepository(db)
    manager_repo = ManagerRepository(db)
    teacher_repo = TeacherRepository(db)
    student_repo = StudentRepository(db)
    course_repo = CourseRepository(db)
    module_repo = CourseModuleRepository(db)
    lesson_repo = CourseLessonRepository(db)
    material_repo = CourseMaterialRepository(db)
    file_repo = FileRepository(db)
    group_repo = GroupRepository(db)
    type_repo = QuestionTypeRepository(db)
    test_repo = TestRepository(db)

    organization = org_repo.create(
        legal_address="Москва, ул. Учебная, 1",
        payment_start_date=date.today(),
        payment_end_date=date(date.today().year + 1, date.today().month, min(date.today().day, 28)),
    )

    admin_repo.create(
        login="admin",
        password="AdminDemo!2026",
        organization_id=organization.id,
        first_name="Админ",
        last_name="Платформы",
    )

    manager_repo.create(
        login="manager",
        password="ManagerDemo!2026",
        organization_id=organization.id,
        first_name="Мария",
        last_name="Орлова",
        phone="+79990000005",
    )

    template_course = course_repo.create(
        title="Математика",
        description="Шаблон базового курса математики для учебных групп",
        organization_id=organization.id,
        max_modules_count=2,
    )

    module = module_repo.create(
        title="Алгебра",
        module_number=1,
        course_id=template_course.id,
    )

    lesson = lesson_repo.create(
        title="Линейные уравнения",
        lesson_number=1,
        course_id=template_course.id,
        module_id=module.id,
        description="Решение линейных уравнений",
    )

    material = material_repo.create(
        course_id=template_course.id,
        lesson_id=lesson.id,
        homework_text="Решить 10 уравнений из раздаточного материала.",
    )
    file_repo.create(
        path="algebra-intro.pdf",
        material_id=material.id,
        name="algebra-intro.pdf",
        size=1024,
        url="/api/v1/files/algebra-intro.pdf",
    )

    question_types = {
        type_name: type_repo.get_by_name(type_name) or type_repo.create(type_name)
        for type_name in ("text", "single_choice", "multiple_choice")
    }

    test = test_repo.create(
        course_id=template_course.id,
        title="Проверка по линейным уравнениям",
        lesson_id=lesson.id,
    )
    test_repo.update(
        test.id,
        questions=[
            {
                "front_id": "seed-question-1",
                "number": 1,
                "text": "Сколько будет 2 + 2?",
                "type_id": question_types["single_choice"].id,
                "answers": [
                    {"text": "3", "is_right": False},
                    {"text": "4", "is_right": True},
                    {"text": "5", "is_right": False},
                ],
            }
        ],
    )

    teacher_schedule = [
        {"id": "teacher-slot-1", "day": "monday", "start": "10:00", "end": "14:00"},
        {"id": "teacher-slot-2", "day": "wednesday", "start": "12:00", "end": "16:00"},
    ]
    teacher = teacher_repo.create(
        login="teacher",
        password="TeacherDemo!2026",
        organization_id=organization.id,
        first_name="Иван",
        last_name="Петров",
        birth_date=date(1994, 5, 15),
        phone="+79990000001",
        is_ovz=False,
        course_ids=[template_course.id],
        schedule_preferences=teacher_schedule,
    )

    teacher_repo.create(
        login="teacher2",
        password="TeacherTwo!2026",
        organization_id=organization.id,
        first_name="Елена",
        last_name="Соколова",
        birth_date=date(1996, 9, 4),
        phone="+79990000004",
        is_ovz=False,
        course_ids=[template_course.id],
        schedule_preferences=[
            {"id": "teacher-slot-3", "day": "monday", "start": "12:00", "end": "18:00"},
            {"id": "teacher-slot-4", "day": "thursday", "start": "11:00", "end": "15:00"},
        ],
    )

    student = student_repo.create(
        login="student",
        password="StudentDemo!2026",
        organization_id=organization.id,
        first_name="Анна",
        last_name="Смирнова",
        parent_phone="+79990000002",
        birth_date=date(2012, 4, 17),
    )

    second_student = student_repo.create(
        login="student2",
        password="StudentTwo!2026",
        organization_id=organization.id,
        first_name="Дмитрий",
        last_name="Ковалев",
        parent_phone="+79990000003",
        birth_date=date(2011, 9, 12),
    )

    group_repo.create(
        group_number="101",
        organization_id=organization.id,
        teacher_id=teacher.id,
        student_ids=[student.id, second_student.id],
        course_id=template_course.id,
        planned_start_date=date.today(),
        planned_end_date=None,
        planned_schedule_slots=[
            {"id": "group-slot-1", "day": "monday", "start": "10:00", "end": "12:00"},
        ],
    )

    db.commit()
