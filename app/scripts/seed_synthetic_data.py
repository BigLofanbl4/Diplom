from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from app.database import SessionLocal
from app.repositories import (
    AdminRepository,
    CourseLessonRepository,
    CourseModuleRepository,
    CourseRepository,
    GroupRepository,
    OrganizationRepository,
    StudentRepository,
    TeacherRepository,
)


@dataclass
class SeedResult:
    organization_id: int
    admin_login: str
    teacher_login: str
    student_login: str
    password: str
    courses_count: int
    groups_count: int
    teachers_count: int
    students_count: int


def run_seed() -> SeedResult:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    password = "DemoPass123!"

    admin_login = f"demo_admin_{ts}"
    teacher_login = f"demo_teacher_1_{ts}"
    student_login = f"demo_student_1_{ts}"

    db = SessionLocal()
    try:
        org_repo = OrganizationRepository(db)
        admin_repo = AdminRepository(db)
        teacher_repo = TeacherRepository(db)
        student_repo = StudentRepository(db)
        course_repo = CourseRepository(db)
        module_repo = CourseModuleRepository(db)
        lesson_repo = CourseLessonRepository(db)
        group_repo = GroupRepository(db)

        org = org_repo.create(
            legal_address=f"SYNTHETIC DEMO ORG {ts}",
            payment_start_date=date.today(),
            payment_end_date=date(date.today().year + 1, date.today().month, date.today().day),
        )

        admin_repo.create(
            login=admin_login,
            password=password,
            organization_id=org.id,
            first_name="Demo",
            last_name="Admin",
        )

        teachers = []
        for idx in range(1, 6):
            login = teacher_login if idx == 1 else f"demo_teacher_{idx}_{ts}"
            teacher = teacher_repo.create(
                login=login,
                password=password,
                organization_id=org.id,
                first_name=f"Teacher{idx}",
                last_name="Demo",
                birth_date=date(1988 + idx, (idx % 12) + 1, min(28, 10 + idx)),
                phone=f"+79995550{idx:03d}",
                is_ovz=(idx % 2 == 0),
            )
            teachers.append(teacher)

        students = []
        for idx in range(1, 26):
            login = student_login if idx == 1 else f"demo_student_{idx}_{ts}"
            student = student_repo.create(
                login=login,
                password=password,
                organization_id=org.id,
                first_name=f"Student{idx}",
                last_name="Demo",
                parent_phone=f"+79996660{idx:03d}",
                birth_date=date(2008 + (idx % 7), (idx % 12) + 1, min(28, (idx % 27) + 1)),
            )
            students.append(student)

        courses = []
        for idx in range(1, 7):
            course = course_repo.create(
                title=f"Demo Course {idx}",
                description=f"Synthetic course #{idx}",
                organization_id=org.id,
            )
            courses.append(course)

            lesson_number = 1
            for module_idx in range(1, 3):
                module = module_repo.create(
                    title=f"Module {module_idx}",
                    module_number=module_idx,
                    course_id=course.id,
                )
                for local_lesson_idx in range(1, 3):
                    lesson_repo.create(
                        title=f"Lesson {module_idx}.{local_lesson_idx}",
                        lesson_number=lesson_number,
                        course_id=course.id,
                        module_id=module.id,
                        description=f"Lesson {lesson_number} of course {idx}",
                    )
                    lesson_number += 1

        groups = []
        for idx in range(1, 11):
            course_id = courses[(idx - 1) % len(courses)].id if idx % 4 != 0 else None
            teacher_id = teachers[(idx - 1) % len(teachers)].id
            student_ids = [
                students[(idx * 2 - 2) % len(students)].id,
                students[(idx * 2 - 1) % len(students)].id,
                students[(idx * 2) % len(students)].id,
            ]

            group = group_repo.create(
                group_number=f"G-{idx:02d}",
                organization_id=org.id,
                teacher_id=teacher_id,
                student_ids=student_ids,
                course_id=course_id,
            )
            groups.append(group)

        return SeedResult(
            organization_id=org.id,
            admin_login=admin_login,
            teacher_login=teacher_login,
            student_login=student_login,
            password=password,
            courses_count=len(courses),
            groups_count=len(groups),
            teachers_count=len(teachers),
            students_count=len(students),
        )
    finally:
        db.close()


def main() -> None:
    result = run_seed()
    print("Synthetic data seed completed")
    print(f"organization_id={result.organization_id}")
    print(f"admin_login={result.admin_login}")
    print(f"teacher_login={result.teacher_login}")
    print(f"student_login={result.student_login}")
    print(f"password={result.password}")
    print(
        "counts:"
        f" courses={result.courses_count},"
        f" groups={result.groups_count},"
        f" teachers={result.teachers_count},"
        f" students={result.students_count}"
    )


if __name__ == "__main__":
    main()
