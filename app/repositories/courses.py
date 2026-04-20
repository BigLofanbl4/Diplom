from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models.courses import (
    Answer,
    Course,
    CourseLesson,
    CourseMaterial,
    CourseModule,
    File,
    Question,
    QuestionType,
    Test,
)
from app.models.groups import Group

from .base import BaseRepository


class CourseRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, organization_id: int | None = None) -> list[Course]:
        stmt = select(Course).options(
            selectinload(Course.modules),
            selectinload(Course.lessons),
            selectinload(Course.materials),
            selectinload(Course.groups),
            selectinload(Course.lessons).selectinload(CourseLesson.test),
            selectinload(Course.lessons).selectinload(CourseLesson.materials).selectinload(CourseMaterial.files),
        )
        if organization_id is not None:
            stmt = stmt.where(Course.organization_id == organization_id)
        return self.db.scalars(stmt).all()

    def get(self, course_id: int) -> Course | None:
        stmt = (
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.modules),
                selectinload(Course.lessons),
                selectinload(Course.materials),
                selectinload(Course.groups),
                selectinload(Course.lessons).selectinload(CourseLesson.test),
                selectinload(Course.lessons).selectinload(CourseLesson.materials).selectinload(CourseMaterial.files),
            )
        )
        return self.db.scalar(stmt)

    def create(
        self,
        title: str,
        organization_id: int,
        description: str | None = None,
        *,
        kind: str = "template",
        template_course_id: int | None = None,
        group_id: int | None = None,
        teacher_id: int | None = None,
        max_modules_count: int = 0,
    ) -> Course:
        course = Course(
            title=title,
            description=description,
            organization_id=organization_id,
            kind=kind,
            template_course_id=template_course_id,
            group_id=group_id,
            teacher_id=teacher_id,
            max_modules_count=max_modules_count,
        )
        return self._save(course)

    def update(
        self,
        course_id: int,
        *,
        title: str | None = None,
        description: str | None = None,
        organization_id: int | None = None,
        kind: str | None = None,
        template_course_id: int | None = None,
        template_course_id_set: bool = False,
        group_id: int | None = None,
        group_id_set: bool = False,
        teacher_id: int | None = None,
        teacher_id_set: bool = False,
        max_modules_count: int | None = None,
    ) -> Course | None:
        course = self.db.get(Course, course_id)
        if course is None:
            return None

        if title is not None:
            course.title = title
        if description is not None:
            course.description = description
        if organization_id is not None:
            course.organization_id = organization_id
        if kind is not None:
            course.kind = kind
        if template_course_id_set:
            course.template_course_id = template_course_id
        if group_id_set:
            course.group_id = group_id
        if teacher_id_set:
            course.teacher_id = teacher_id
        if max_modules_count is not None:
            course.max_modules_count = max_modules_count

        self.db.commit()
        self.db.refresh(course)
        return course

    def delete(self, course_id: int) -> bool:
        course = self.db.get(Course, course_id)
        if course is None:
            return False
        # Business rule: course deletion should keep groups and nullify their course link.
        self.db.execute(
            update(Group)
            .where(Group.template_course_id == course_id)
            .values(template_course_id=None)
        )
        self.db.delete(course)
        self.db.commit()
        return True

    def get_instance_by_group_id(self, group_id: int) -> Course | None:
        stmt = (
            select(Course)
            .where(Course.group_id == group_id, Course.kind == "instance")
            .options(
                selectinload(Course.modules),
                selectinload(Course.lessons).selectinload(CourseLesson.test),
                selectinload(Course.lessons).selectinload(CourseLesson.materials).selectinload(CourseMaterial.files),
            )
        )
        return self.db.scalar(stmt)


class CourseModuleRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, course_id: int | None = None) -> list[CourseModule]:
        stmt = select(CourseModule).options(selectinload(CourseModule.lessons))
        if course_id is not None:
            stmt = stmt.where(CourseModule.course_id == course_id)
        return self.db.scalars(stmt).all()

    def get(self, module_id: int) -> CourseModule | None:
        stmt = (
            select(CourseModule)
            .where(CourseModule.id == module_id)
            .options(selectinload(CourseModule.lessons))
        )
        return self.db.scalar(stmt)

    def create(self, title: str, module_number: int, course_id: int) -> CourseModule:
        module = CourseModule(
            title=title,
            module_number=module_number,
            course_id=course_id,
        )
        return self._save(module)

    def update(
        self,
        module_id: int,
        *,
        title: str | None = None,
        module_number: int | None = None,
        course_id: int | None = None,
    ) -> CourseModule | None:
        module = self.db.get(CourseModule, module_id)
        if module is None:
            return None

        if title is not None:
            module.title = title
        if module_number is not None:
            module.module_number = module_number
        if course_id is not None:
            module.course_id = course_id

        self.db.commit()
        self.db.refresh(module)
        return module

    def delete(self, module_id: int) -> bool:
        module = self.db.get(CourseModule, module_id)
        if module is None:
            return False
        self.db.delete(module)
        self.db.commit()
        return True


class CourseLessonRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(
        self,
        *,
        course_id: int | None = None,
        module_id: int | None = None,
    ) -> list[CourseLesson]:
        stmt = select(CourseLesson).options(
            selectinload(CourseLesson.materials).selectinload(CourseMaterial.files),
            selectinload(CourseLesson.test),
        )
        if course_id is not None:
            stmt = stmt.where(CourseLesson.course_id == course_id)
        if module_id is not None:
            stmt = stmt.where(CourseLesson.module_id == module_id)
        return self.db.scalars(stmt).all()

    def get(self, lesson_id: int) -> CourseLesson | None:
        stmt = (
            select(CourseLesson)
            .where(CourseLesson.id == lesson_id)
            .options(
                selectinload(CourseLesson.materials).selectinload(CourseMaterial.files),
                selectinload(CourseLesson.test),
            )
        )
        return self.db.scalar(stmt)

    def create(
        self,
        title: str,
        lesson_number: int,
        course_id: int,
        module_id: int | None = None,
        description: str | None = None,
    ) -> CourseLesson:
        lesson = CourseLesson(
            title=title,
            lesson_number=lesson_number,
            description=description,
            course_id=course_id,
            module_id=module_id,
        )
        return self._save(lesson)

    def update(
        self,
        lesson_id: int,
        *,
        title: str | None = None,
        lesson_number: int | None = None,
        description: str | None = None,
        course_id: int | None = None,
        module_id: int | None = None,
        module_id_set: bool = False,
    ) -> CourseLesson | None:
        lesson = self.db.get(CourseLesson, lesson_id)
        if lesson is None:
            return None

        if title is not None:
            lesson.title = title
        if lesson_number is not None:
            lesson.lesson_number = lesson_number
        if description is not None:
            lesson.description = description
        if course_id is not None:
            lesson.course_id = course_id
        if module_id_set:
            lesson.module_id = module_id

        self.db.commit()
        self.db.refresh(lesson)
        return lesson

    def delete(self, lesson_id: int) -> bool:
        lesson = self.db.get(CourseLesson, lesson_id)
        if lesson is None:
            return False
        self.db.delete(lesson)
        self.db.commit()
        return True


class CourseMaterialRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(
        self,
        *,
        course_id: int | None = None,
        lesson_id: int | None = None,
    ) -> list[CourseMaterial]:
        stmt = select(CourseMaterial).options(selectinload(CourseMaterial.files))
        if course_id is not None:
            stmt = stmt.where(CourseMaterial.course_id == course_id)
        if lesson_id is not None:
            stmt = stmt.where(CourseMaterial.lesson_id == lesson_id)
        return self.db.scalars(stmt).all()

    def get(self, material_id: int) -> CourseMaterial | None:
        stmt = (
            select(CourseMaterial)
            .where(CourseMaterial.id == material_id)
            .options(selectinload(CourseMaterial.files))
        )
        return self.db.scalar(stmt)

    def create(
        self,
        *,
        course_id: int,
        lesson_id: int,
        homework_file: str | None = None,
        homework_text: str | None = None,
    ) -> CourseMaterial:
        material = CourseMaterial(
            homework_file=homework_file,
            homework_text=homework_text,
            course_id=course_id,
            lesson_id=lesson_id,
        )
        return self._save(material)

    def update(
        self,
        material_id: int,
        *,
        homework_file: str | None = None,
        homework_text: str | None = None,
        course_id: int | None = None,
        lesson_id: int | None = None,
    ) -> CourseMaterial | None:
        material = self.db.get(CourseMaterial, material_id)
        if material is None:
            return None

        if homework_file is not None:
            material.homework_file = homework_file
        if homework_text is not None:
            material.homework_text = homework_text
        if course_id is not None:
            material.course_id = course_id
        if lesson_id is not None:
            material.lesson_id = lesson_id

        self.db.commit()
        self.db.refresh(material)
        return material

    def delete(self, material_id: int) -> bool:
        material = self.db.get(CourseMaterial, material_id)
        if material is None:
            return False
        self.db.delete(material)
        self.db.commit()
        return True


class FileRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, material_id: int | None = None) -> list[File]:
        stmt = select(File)
        if material_id is not None:
            stmt = stmt.where(File.material_id == material_id)
        return self.db.scalars(stmt).all()

    def get(self, file_id: int) -> File | None:
        return self.db.get(File, file_id)

    def create(
        self,
        *,
        path: str,
        material_id: int,
        name: str | None = None,
        size: int = 0,
        url: str | None = None,
    ) -> File:
        resolved_name = name if name is not None else path
        resolved_url = url if url is not None else path
        file = File(
            name=resolved_name,
            size=size,
            url=resolved_url,
            path=path,
            material_id=material_id,
        )
        return self._save(file)

    def update(
        self,
        file_id: int,
        *,
        name: str | None = None,
        size: int | None = None,
        url: str | None = None,
        path: str | None = None,
        material_id: int | None = None,
    ) -> File | None:
        file = self.db.get(File, file_id)
        if file is None:
            return None

        if name is not None:
            file.name = name
        if size is not None:
            file.size = size
        if url is not None:
            file.url = url
        if path is not None:
            file.path = path
        if material_id is not None:
            file.material_id = material_id

        self.db.commit()
        self.db.refresh(file)
        return file

    def delete(self, file_id: int) -> bool:
        file = self.db.get(File, file_id)
        if file is None:
            return False
        self.db.delete(file)
        self.db.commit()
        return True


class QuestionTypeRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self) -> list[QuestionType]:
        stmt = select(QuestionType)
        return self.db.scalars(stmt).all()

    def get(self, type_id: int) -> QuestionType | None:
        return self.db.get(QuestionType, type_id)

    def get_by_name(self, type_name: str) -> QuestionType | None:
        stmt = select(QuestionType).where(QuestionType.type == type_name)
        return self.db.scalar(stmt)

    def create(self, type_name: str) -> QuestionType:
        question_type = QuestionType(type=type_name)
        return self._save(question_type)

    def update(self, type_id: int, *, type_name: str | None = None) -> QuestionType | None:
        question_type = self.db.get(QuestionType, type_id)
        if question_type is None:
            return None

        if type_name is not None:
            question_type.type = type_name

        self.db.commit()
        self.db.refresh(question_type)
        return question_type

    def delete(self, type_id: int) -> bool:
        question_type = self.db.get(QuestionType, type_id)
        if question_type is None:
            return False
        self.db.delete(question_type)
        self.db.commit()
        return True


class TestRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(
        self,
        *,
        course_id: int | None = None,
        lesson_id: int | None = None,
    ) -> list[Test]:
        stmt = select(Test).options(
            selectinload(Test.questions).selectinload(Question.answers),
            selectinload(Test.questions).selectinload(Question.type),
        )
        if course_id is not None:
            stmt = stmt.where(Test.course_id == course_id)
        if lesson_id is not None:
            stmt = stmt.where(Test.lesson_id == lesson_id)
        return self.db.scalars(stmt).all()

    def get(self, test_id: int) -> Test | None:
        stmt = (
            select(Test)
            .where(Test.id == test_id)
            .options(
                selectinload(Test.questions).selectinload(Question.answers),
                selectinload(Test.questions).selectinload(Question.type),
            )
        )
        return self.db.scalar(stmt)

    def create(self, course_id: int, title: str, lesson_id: int) -> Test:
        test = Test(course_id=course_id, title=title, lesson_id=lesson_id)
        return self._save(test)

    def update(
        self,
        test_id: int,
        questions: list[dict[str, Any]] | None = None,
        *,
        title: str | None = None,
        course_id: int | None = None,
        lesson_id: int | None = None,
    ) -> Test | None:
        test = self.get(test_id)
        if test is None:
            return None

        if title is not None:
            test.title = title
        if course_id is not None:
            test.course_id = course_id
        if lesson_id is not None:
            test.lesson_id = lesson_id

        if questions is not None:
            test.questions.clear()
            for payload in questions:
                question = Question(
                    front_id=payload["front_id"],
                    number=payload["number"],
                    text=payload["text"],
                    type_id=payload["type_id"],
                )
                answers_payload = payload.get("answers")
                if answers_payload:
                    question.answers = [
                        Answer(
                            text=answer_payload["text"],
                            is_right=bool(answer_payload.get("is_right", False)),
                        )
                        for answer_payload in answers_payload
                    ]
                test.questions.append(question)

        self.db.commit()
        self.db.refresh(test)
        return test

    def delete(self, test_id: int) -> bool:
        test = self.db.get(Test, test_id)
        if test is None:
            return False
        self.db.delete(test)
        self.db.commit()
        return True


class QuestionRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(
        self,
        *,
        test_id: int | None = None,
        type_id: int | None = None,
    ) -> list[Question]:
        stmt = select(Question).options(selectinload(Question.answers))
        if test_id is not None:
            stmt = stmt.where(Question.test_id == test_id)
        if type_id is not None:
            stmt = stmt.where(Question.type_id == type_id)
        return self.db.scalars(stmt).all()

    def get(self, question_id: int) -> Question | None:
        stmt = (
            select(Question)
            .where(Question.id == question_id)
            .options(selectinload(Question.answers))
        )
        return self.db.scalar(stmt)

    def create(self, front_id: str, text: str, test_id: int, type_id: int, number: int = 1) -> Question:
        question = Question(
            front_id=front_id,
            number=number,
            text=text,
            test_id=test_id,
            type_id=type_id,
        )
        return self._save(question)

    def update(
        self,
        question_id: int,
        *,
        front_id: str | None = None,
        number: int | None = None,
        text: str | None = None,
        test_id: int | None = None,
        type_id: int | None = None,
        answers: Sequence[dict[str, Any]] | None = None,
    ) -> Question | None:
        question = self.get(question_id)
        if question is None:
            return None

        if front_id is not None:
            question.front_id = front_id
        if number is not None:
            question.number = number
        if text is not None:
            question.text = text
        if test_id is not None:
            question.test_id = test_id
        if type_id is not None:
            question.type_id = type_id

        if answers is not None:
            question.answers.clear()
            question.answers.extend(
                [
                    Answer(
                        text=answer_payload["text"],
                        is_right=bool(answer_payload.get("is_right", False)),
                    )
                    for answer_payload in answers
                ]
            )

        self.db.commit()
        self.db.refresh(question)
        return question

    def delete(self, question_id: int) -> bool:
        question = self.db.get(Question, question_id)
        if question is None:
            return False
        self.db.delete(question)
        self.db.commit()
        return True


class AnswerRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)

    def list(self, *, question_id: int | None = None) -> list[Answer]:
        stmt = select(Answer)
        if question_id is not None:
            stmt = stmt.where(Answer.question_id == question_id)
        return self.db.scalars(stmt).all()

    def get(self, answer_id: int) -> Answer | None:
        return self.db.get(Answer, answer_id)

    def create(self, text: str, question_id: int, is_right: bool = False) -> Answer:
        answer = Answer(text=text, question_id=question_id, is_right=is_right)
        return self._save(answer)

    def update(
        self,
        answer_id: int,
        *,
        text: str | None = None,
        question_id: int | None = None,
        is_right: bool | None = None,
    ) -> Answer | None:
        answer = self.db.get(Answer, answer_id)
        if answer is None:
            return None

        if text is not None:
            answer.text = text
        if question_id is not None:
            answer.question_id = question_id
        if is_right is not None:
            answer.is_right = is_right

        self.db.commit()
        self.db.refresh(answer)
        return answer

    def delete(self, answer_id: int) -> bool:
        answer = self.db.get(Answer, answer_id)
        if answer is None:
            return False
        self.db.delete(answer)
        self.db.commit()
        return True
