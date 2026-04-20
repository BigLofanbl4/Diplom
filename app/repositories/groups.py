from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.groups import Group, GroupCourse, GroupLesson, GroupModule
from app.models.students import Student

from .base import BaseRepository


class GroupRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(
        self,
        *,
        organization_id: int | None = None,
        teacher_id: int | None = None,
    ) -> list[Group]:
        stmt = select(Group).options(
            selectinload(Group.students),
            selectinload(Group.teacher),
            selectinload(Group.lessons),
            selectinload(Group.custom_course),
        )
        if organization_id is not None:
            stmt = stmt.where(Group.organization_id == organization_id)
        if teacher_id is not None:
            stmt = stmt.where(Group.teacher_id == teacher_id)
        return self.db.scalars(stmt).all()

    def get(self, group_id: int) -> Group | None:
        stmt = (
            select(Group)
            .where(Group.id == group_id)
            .options(
                selectinload(Group.students),
                selectinload(Group.teacher),
                selectinload(Group.lessons),
                selectinload(Group.custom_course),
            )
        )
        return self.db.scalar(stmt)

    def create(
        self,
        group_number: str,
        template_course_id: int | None = None,
        organization_id: int | None = None,
        teacher_id: int | None = None,
        student_ids: Sequence[int] | None = None,
        course_id: int | None = None,
    ) -> Group:
        resolved_course_id = template_course_id if template_course_id is not None else course_id
        if organization_id is None:
            raise ValueError("organization_id is required")

        group = Group(
            group_number=group_number,
            template_course_id=resolved_course_id,
            organization_id=organization_id,
            teacher_id=teacher_id,
        )
        if student_ids is not None:
            group.students = self._load_students(student_ids)
        return self._save(group)

    def update(
        self,
        group_id: int,
        *,
        group_number: str | None = None,
        template_course_id: int | None = None,
        template_course_id_set: bool = False,
        course_id: int | None = None,
        course_id_set: bool = False,
        organization_id: int | None = None,
        teacher_id: int | None = None,
        student_ids: Sequence[int] | None = None,
    ) -> Group | None:
        group = self.db.get(Group, group_id)
        if group is None:
            return None

        if group_number is not None:
            group.group_number = group_number
        if template_course_id_set:
            group.template_course_id = template_course_id
        elif course_id_set:
            group.template_course_id = course_id
        if organization_id is not None:
            group.organization_id = organization_id
        if teacher_id is not None:
            group.teacher_id = teacher_id
        if student_ids is not None:
            group.students = self._load_students(student_ids)

        self.db.commit()
        self.db.refresh(group)
        return group

    def delete(self, group_id: int) -> bool:
        group = self.db.get(Group, group_id)
        if group is None:
            return False
        self.db.delete(group)
        self.db.commit()
        return True

    def set_students(self, group_id: int, student_ids: Sequence[int]) -> Group | None:
        group = self.db.get(Group, group_id)
        if group is None:
            return None
        group.students = self._load_students(student_ids)
        self.db.commit()
        self.db.refresh(group)
        return group

    def _load_students(self, student_ids: Sequence[int]) -> list[Student]:
        unique_ids = list(dict.fromkeys(student_ids))
        if not unique_ids:
            return []

        stmt = select(Student).where(Student.id.in_(unique_ids))
        students = self.db.scalars(stmt).all()
        students_by_id = {student.id: student for student in students}
        return [students_by_id[student_id] for student_id in unique_ids if student_id in students_by_id]


class GroupCourseRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(
        self,
        *,
        organization_id: int | None = None,
        group_id: int | None = None,
    ) -> list[GroupCourse]:
        stmt = select(GroupCourse).options(
            selectinload(GroupCourse.group),
            selectinload(GroupCourse.modules),
            selectinload(GroupCourse.lessons),
        )
        if organization_id is not None:
            stmt = stmt.where(GroupCourse.organization_id == organization_id)
        if group_id is not None:
            stmt = stmt.where(GroupCourse.group_id == group_id)
        return self.db.scalars(stmt).all()

    def get(self, course_id: int) -> GroupCourse | None:
        stmt = (
            select(GroupCourse)
            .where(GroupCourse.id == course_id)
            .options(
                selectinload(GroupCourse.group),
                selectinload(GroupCourse.modules),
                selectinload(GroupCourse.lessons),
            )
        )
        return self.db.scalar(stmt)

    def create(
        self,
        title: str,
        description: str,
        organization_id: int,
        group_id: int,
    ) -> GroupCourse:
        group_course = GroupCourse(
            title=title,
            description=description,
            organization_id=organization_id,
            group_id=group_id,
        )
        return self._save(group_course)

    def update(
        self,
        course_id: int,
        *,
        title: str | None = None,
        description: str | None = None,
        organization_id: int | None = None,
        group_id: int | None = None,
    ) -> GroupCourse | None:
        group_course = self.db.get(GroupCourse, course_id)
        if group_course is None:
            return None

        if title is not None:
            group_course.title = title
        if description is not None:
            group_course.description = description
        if organization_id is not None:
            group_course.organization_id = organization_id
        if group_id is not None:
            group_course.group_id = group_id

        self.db.commit()
        self.db.refresh(group_course)
        return group_course

    def delete(self, course_id: int) -> bool:
        group_course = self.db.get(GroupCourse, course_id)
        if group_course is None:
            return False
        self.db.delete(group_course)
        self.db.commit()
        return True


class GroupModuleRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, course_id: int | None = None) -> list[GroupModule]:
        stmt = select(GroupModule).options(selectinload(GroupModule.lessons))
        if course_id is not None:
            stmt = stmt.where(GroupModule.course_id == course_id)
        return self.db.scalars(stmt).all()

    def get(self, module_id: int) -> GroupModule | None:
        stmt = (
            select(GroupModule)
            .where(GroupModule.id == module_id)
            .options(selectinload(GroupModule.lessons))
        )
        return self.db.scalar(stmt)

    def create(self, title: str, module_number: int, course_id: int) -> GroupModule:
        group_module = GroupModule(
            title=title,
            module_number=module_number,
            course_id=course_id,
        )
        return self._save(group_module)

    def update(
        self,
        module_id: int,
        *,
        title: str | None = None,
        module_number: int | None = None,
        course_id: int | None = None,
    ) -> GroupModule | None:
        group_module = self.db.get(GroupModule, module_id)
        if group_module is None:
            return None

        if title is not None:
            group_module.title = title
        if module_number is not None:
            group_module.module_number = module_number
        if course_id is not None:
            group_module.course_id = course_id

        self.db.commit()
        self.db.refresh(group_module)
        return group_module

    def delete(self, module_id: int) -> bool:
        group_module = self.db.get(GroupModule, module_id)
        if group_module is None:
            return False
        self.db.delete(group_module)
        self.db.commit()
        return True


class GroupLessonRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(
        self,
        *,
        group_id: int | None = None,
        module_id: int | None = None,
        course_id: int | None = None,
    ) -> list[GroupLesson]:
        stmt = select(GroupLesson).options(selectinload(GroupLesson.homeworks))
        if group_id is not None:
            stmt = stmt.where(GroupLesson.group_id == group_id)
        if module_id is not None:
            stmt = stmt.where(GroupLesson.module_id == module_id)
        if course_id is not None:
            stmt = stmt.where(GroupLesson.course_id == course_id)
        return self.db.scalars(stmt).all()

    def get(self, lesson_id: int) -> GroupLesson | None:
        stmt = (
            select(GroupLesson)
            .where(GroupLesson.id == lesson_id)
            .options(selectinload(GroupLesson.homeworks))
        )
        return self.db.scalar(stmt)

    def create(
        self,
        *,
        lesson_number: int,
        group_id: int,
        course_id: int,
        material_links: Sequence[str] | None = None,
        module_id: int | None = None,
        homework_text: str | None = None,
        homework_file: str | None = None,
    ) -> GroupLesson:
        group_lesson = GroupLesson(
            lesson_number=lesson_number,
            group_id=group_id,
            course_id=course_id,
            material_links=list(material_links or []),
            module_id=module_id,
            homework_text=homework_text,
            homework_file=homework_file,
        )
        return self._save(group_lesson)

    def update(
        self,
        lesson_id: int,
        *,
        lesson_number: int | None = None,
        group_id: int | None = None,
        course_id: int | None = None,
        material_links: Sequence[str] | None = None,
        module_id: int | None = None,
        homework_text: str | None = None,
        homework_file: str | None = None,
    ) -> GroupLesson | None:
        group_lesson = self.db.get(GroupLesson, lesson_id)
        if group_lesson is None:
            return None

        if lesson_number is not None:
            group_lesson.lesson_number = lesson_number
        if group_id is not None:
            group_lesson.group_id = group_id
        if course_id is not None:
            group_lesson.course_id = course_id
        if material_links is not None:
            group_lesson.material_links = list(material_links)
        if module_id is not None:
            group_lesson.module_id = module_id
        if homework_text is not None:
            group_lesson.homework_text = homework_text
        if homework_file is not None:
            group_lesson.homework_file = homework_file

        self.db.commit()
        self.db.refresh(group_lesson)
        return group_lesson

    def delete(self, lesson_id: int) -> bool:
        group_lesson = self.db.get(GroupLesson, lesson_id)
        if group_lesson is None:
            return False
        self.db.delete(group_lesson)
        self.db.commit()
        return True
