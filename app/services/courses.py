from __future__ import annotations

from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.courses import Course, CourseLesson, CourseModule
from app.models.organization import User
from app.repositories import (
    CourseLessonRepository,
    CourseMaterialRepository,
    CourseModuleRepository,
    CourseRepository,
    FileRepository,
    QuestionTypeRepository,
    TestRepository,
)
from app.schemas.courses import (
    CourseCreateRequest,
    CourseDetail,
    CourseLessonOut,
    CourseListItem,
    CourseModuleCreateRequest,
    CourseModuleOut,
    CourseModuleUpdateRequest,
    CoursesListResponse,
    CourseUpdateRequest,
    TestOut,
)
from app.services.homework_monitoring import sync_homework_monitoring
from app.utils.api_errors import not_found
from app.utils.course_instances import (
    clone_template_test,
    find_template_lesson,
    find_template_module,
    is_instance_course,
)
from app.utils.file_storage import copy_stored_file, remove_stored_file, save_upload_file
from app.utils.serializers import serialize_course, serialize_course_detail, serialize_lesson, serialize_test


class CourseAdminService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
        self.course_repo = CourseRepository(db)

    def list_courses(self) -> CoursesListResponse:
        courses = [
            course for course in self.course_repo.list(organization_id=self.current_user.organization_id)
            if course.kind != "instance"
        ]
        courses = sorted(courses, key=lambda item: item.id)
        return CoursesListResponse(
            data=[CourseListItem.model_validate(serialize_course(course, self.course_repo)) for course in courses],
        )

    def get_course(self, course_id: int) -> CourseDetail:
        course = self._get_scoped_course_or_404(course_id)
        return CourseDetail.model_validate(serialize_course_detail(course, self.course_repo))

    def create_course(self, data: CourseCreateRequest) -> CourseListItem:
        try:
            course = self.course_repo.create(
                title=data.title,
                description=data.description,
                organization_id=self.current_user.organization_id,
                kind="template",
                max_modules_count=0,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
        return CourseListItem.model_validate(serialize_course(course, self.course_repo))

    def update_course(self, course_id: int, data: CourseUpdateRequest) -> CourseListItem:
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

        self._get_scoped_course_or_404(course_id)
        try:
            updated = self.course_repo.update(
                course_id,
                title=payload.get("title"),
                description=payload.get("description"),
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        if updated is None:
            raise not_found("Course not found")
        return CourseListItem.model_validate(serialize_course(updated, self.course_repo))

    def delete_course(self, course_id: int) -> None:
        self._get_scoped_course_or_404(course_id)
        self.course_repo.delete(course_id)

    def list_modules(self, course_id: int) -> list[CourseModuleOut]:
        self._get_scoped_course_or_404(course_id)
        modules = CourseModuleRepository(self.db).list(course_id=course_id)
        modules = sorted(modules, key=lambda item: (item.module_number, item.id))
        return [CourseModuleOut.model_validate(module) for module in modules]

    def get_module(self, course_id: int, module_id: int) -> CourseModuleOut:
        self._get_scoped_course_or_404(course_id)
        module = self._get_scoped_module_or_404(
            CourseModuleRepository(self.db),
            course_id=course_id,
            module_id=module_id,
        )
        return CourseModuleOut.model_validate(module)

    def create_module(self, course_id: int, data: CourseModuleCreateRequest) -> CourseModuleOut:
        module_repo = CourseModuleRepository(self.db)
        course = self._get_scoped_course_or_404(course_id)

        title = data.title
        if is_instance_course(course):
            template_module = find_template_module(course, data.module_number, self.course_repo)
            if template_module is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
            title = title or template_module.title
        elif not title:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        try:
            module = module_repo.create(
                title=title,
                module_number=data.module_number,
                course_id=course_id,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        course = self.course_repo.get(course.id) or course
        self._refresh_template_course_limits(course)
        return CourseModuleOut.model_validate(module)

    def update_module(self, course_id: int, module_id: int, data: CourseModuleUpdateRequest) -> CourseModuleOut:
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

        module_repo = CourseModuleRepository(self.db)
        course = self._get_scoped_course_or_404(course_id)
        self._get_scoped_module_or_404(module_repo, course_id=course_id, module_id=module_id)

        next_title = payload.get("title")
        next_number = payload.get("module_number")
        if is_instance_course(course) and next_number is not None:
            template_module = find_template_module(course, next_number, self.course_repo)
            if template_module is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
            if not next_title:
                next_title = template_module.title

        try:
            module = module_repo.update(
                module_id,
                title=next_title,
                module_number=next_number,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        if module is None:
            raise not_found("Module not found")
        refreshed_course = self.course_repo.get(course.id) or course
        self._refresh_template_course_limits(refreshed_course)
        return CourseModuleOut.model_validate(module)

    def delete_module(self, course_id: int, module_id: int) -> None:
        course = self._get_scoped_course_or_404(course_id)
        repo = CourseModuleRepository(self.db)
        self._get_scoped_module_or_404(repo, course_id=course_id, module_id=module_id)
        repo.delete(module_id)
        refreshed_course = self.course_repo.get(course.id) or course
        self._refresh_template_course_limits(refreshed_course)

    def list_lessons(self, course_id: int) -> list[CourseLessonOut]:
        self._get_scoped_course_or_404(course_id)
        lessons = CourseLessonRepository(self.db).list(course_id=course_id)
        lessons = sorted(lessons, key=lambda item: (item.module_id or 0, item.lesson_number, item.id))
        return [self._serialize_lesson(lesson) for lesson in lessons]

    def get_lesson(self, course_id: int, lesson_id: int) -> CourseLessonOut:
        self._get_scoped_course_or_404(course_id)
        lesson = self._get_scoped_lesson_or_404(
            CourseLessonRepository(self.db),
            course_id=course_id,
            lesson_id=lesson_id,
        )
        return self._serialize_lesson(lesson)

    def create_lesson(
        self,
        *,
        course_id: int,
        title: str | None,
        lesson_number: int,
        description: str | None,
        homework_text: str | None,
        module_id_raw: str | None,
        materials: list[UploadFile] | None,
    ) -> CourseLessonOut:
        course = self._get_scoped_course_or_404(course_id)
        module_id_set, module_id = self._parse_optional_module_id(module_id_raw)
        if not module_id_set:
            module_id = None
        self._ensure_module_belongs_to_course(CourseModuleRepository(self.db), course_id=course_id, module_id=module_id)

        module = CourseModuleRepository(self.db).get(module_id) if module_id is not None else None
        template_lesson = None
        resolved_title = title
        resolved_description = description
        resolved_homework_text = homework_text

        if is_instance_course(course):
            if module is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
            template_lesson = find_template_lesson(course, module.module_number, lesson_number, self.course_repo)
            if template_lesson is not None:
                resolved_title = resolved_title or template_lesson.title
                resolved_description = resolved_description or template_lesson.description
                if resolved_homework_text is None:
                    resolved_homework_text = self._extract_material_homework_text(template_lesson)

        if not resolved_title:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        lesson_repo = CourseLessonRepository(self.db)
        material_repo = CourseMaterialRepository(self.db)
        file_repo = FileRepository(self.db)

        try:
            lesson = lesson_repo.create(
                title=resolved_title,
                lesson_number=lesson_number,
                description=resolved_description,
                course_id=course_id,
                module_id=module_id,
            )

            should_create_material = (
                resolved_homework_text is not None
                or bool(materials)
                or bool(template_lesson and any(item.files for item in template_lesson.materials))
            )
            if should_create_material:
                material = material_repo.create(
                    course_id=course_id,
                    lesson_id=lesson.id,
                    homework_text=resolved_homework_text,
                )
                if template_lesson is not None:
                    self._copy_material_files(
                        template_lesson,
                        file_repo,
                        material_id=material.id,
                        course_id=course_id,
                        lesson_id=lesson.id,
                    )
                for upload in materials or []:
                    self._create_material_file_record(
                        upload,
                        file_repo,
                        course_id=course_id,
                        lesson_id=lesson.id,
                        material_id=material.id,
                    )

            if template_lesson is not None and template_lesson.test is not None:
                clone_template_test(template_lesson.test, course_id, lesson.id, TestRepository(self.db))
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        reloaded = lesson_repo.get(lesson.id)
        if reloaded is None:
            raise not_found("Lesson not found")
        self._sync_homework_monitoring_for_course(course)
        return self._serialize_lesson(reloaded)

    def update_lesson(
        self,
        *,
        course_id: int,
        lesson_id: int,
        title: str | None,
        lesson_number_raw: str | None,
        description: str | None,
        homework_text: str | None,
        module_id_raw: str | None,
        removed_material_ids_raw: list[str] | None,
        materials: list[UploadFile] | None,
    ) -> CourseLessonOut:
        lesson_repo = CourseLessonRepository(self.db)
        self._get_scoped_course_or_404(course_id)
        self._get_scoped_lesson_or_404(lesson_repo, course_id=course_id, lesson_id=lesson_id)

        lesson_number_set, lesson_number = self._parse_optional_int("lesson_number", lesson_number_raw)
        module_id_set, module_id = self._parse_optional_module_id(module_id_raw)
        if module_id_set:
            self._ensure_module_belongs_to_course(CourseModuleRepository(self.db), course_id=course_id, module_id=module_id)

        removed_material_ids = self._resolve_removed_ids(removed_material_ids_raw)
        should_add_files = bool(materials and len(materials) > 0)
        should_update_material_text = homework_text is not None
        if (
            title is None
            and not lesson_number_set
            and description is None
            and not module_id_set
            and not should_add_files
            and not removed_material_ids
            and not should_update_material_text
        ):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

        material_repo = CourseMaterialRepository(self.db)
        file_repo = FileRepository(self.db)
        try:
            updated = lesson_repo.update(
                lesson_id,
                title=title,
                lesson_number=lesson_number if lesson_number_set else None,
                description=description,
                module_id=module_id,
                module_id_set=module_id_set,
            )

            lesson_materials = material_repo.list(lesson_id=lesson_id)
            default_material = lesson_materials[0] if lesson_materials else None
            if should_update_material_text:
                if default_material is None:
                    default_material = material_repo.create(course_id=course_id, lesson_id=lesson_id, homework_text=homework_text)
                else:
                    material_repo.update(default_material.id, homework_text=homework_text)

            if removed_material_ids:
                owned_material_file_ids = {file.id for material in lesson_materials for file in material.files}
                for file_id in removed_material_ids:
                    if file_id in owned_material_file_ids:
                        self._delete_material_file_record(file_repo, file_id)

            if should_add_files:
                if default_material is None:
                    default_material = material_repo.create(course_id=course_id, lesson_id=lesson_id)
                for upload in materials or []:
                    self._create_material_file_record(
                        upload,
                        file_repo,
                        course_id=course_id,
                        lesson_id=lesson_id,
                        material_id=default_material.id,
                    )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        if updated is None:
            raise not_found("Lesson not found")
        reloaded = lesson_repo.get(lesson_id)
        if reloaded is None:
            raise not_found("Lesson not found")
        course = self.course_repo.get(course_id)
        if course is not None:
            self._sync_homework_monitoring_for_course(course)
        return self._serialize_lesson(reloaded)

    def delete_lesson(self, course_id: int, lesson_id: int) -> None:
        course = self._get_scoped_course_or_404(course_id)
        repo = CourseLessonRepository(self.db)
        self._get_scoped_lesson_or_404(repo, course_id=course_id, lesson_id=lesson_id)
        repo.delete(lesson_id)
        self._sync_homework_monitoring_for_course(course)

    def get_lesson_test(self, course_id: int, lesson_id: int) -> TestOut:
        self._get_scoped_course_or_404(course_id)
        self._get_scoped_lesson_or_404(CourseLessonRepository(self.db), course_id=course_id, lesson_id=lesson_id)
        tests = TestRepository(self.db).list(course_id=course_id, lesson_id=lesson_id)
        test = tests[0] if tests else None
        if test is None:
            raise not_found("Test not found")
        return TestOut.model_validate(serialize_test(test))

    def create_lesson_test(self, course_id: int, lesson_id: int, payload: dict[str, Any]) -> TestOut:
        self._get_scoped_course_or_404(course_id)
        self._get_scoped_lesson_or_404(CourseLessonRepository(self.db), course_id=course_id, lesson_id=lesson_id)
        test_repo = TestRepository(self.db)
        if test_repo.list(course_id=course_id, lesson_id=lesson_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
        try:
            test = test_repo.create(course_id=course_id, title=str(payload.get("title") or ""), lesson_id=lesson_id)
            questions = self._normalize_questions_payload(list(payload.get("questions") or []))
            updated = test_repo.update(test.id, title=str(payload.get("title") or ""), questions=questions)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
        return TestOut.model_validate(serialize_test(updated or test))

    def update_lesson_test(self, course_id: int, lesson_id: int, payload: dict[str, Any]) -> TestOut:
        self._get_scoped_course_or_404(course_id)
        self._get_scoped_lesson_or_404(CourseLessonRepository(self.db), course_id=course_id, lesson_id=lesson_id)
        test_repo = TestRepository(self.db)
        tests = test_repo.list(course_id=course_id, lesson_id=lesson_id)
        test = tests[0] if tests else None
        if test is None:
            raise not_found("Test not found")
        try:
            updated = test_repo.update(
                test.id,
                title=str(payload.get("title") or ""),
                questions=self._normalize_questions_payload(list(payload.get("questions") or [])),
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")
        if updated is None:
            raise not_found("Test not found")
        return TestOut.model_validate(serialize_test(updated))

    def delete_lesson_test(self, course_id: int, lesson_id: int) -> None:
        self._get_scoped_course_or_404(course_id)
        self._get_scoped_lesson_or_404(CourseLessonRepository(self.db), course_id=course_id, lesson_id=lesson_id)
        test_repo = TestRepository(self.db)
        tests = test_repo.list(course_id=course_id, lesson_id=lesson_id)
        test = tests[0] if tests else None
        if test is None:
            raise not_found("Test not found")
        test_repo.delete(test.id)

    def _get_scoped_course_or_404(self, course_id: int) -> Course:
        course = self.course_repo.get(course_id)
        if course is None or course.organization_id != self.current_user.organization_id:
            raise not_found("Course not found")
        return course

    @staticmethod
    def _get_scoped_module_or_404(
        module_repo: CourseModuleRepository,
        *,
        course_id: int,
        module_id: int,
    ) -> CourseModule:
        module = module_repo.get(module_id)
        if module is None or module.course_id != course_id:
            raise not_found("Module not found")
        return module

    @staticmethod
    def _get_scoped_lesson_or_404(
        lesson_repo: CourseLessonRepository,
        *,
        course_id: int,
        lesson_id: int,
    ) -> CourseLesson:
        lesson = lesson_repo.get(lesson_id)
        if lesson is None or lesson.course_id != course_id:
            raise not_found("Lesson not found")
        return lesson

    @staticmethod
    def _serialize_lesson(lesson: CourseLesson) -> CourseLessonOut:
        return CourseLessonOut.model_validate(serialize_lesson(lesson))

    def _sync_homework_monitoring_for_course(self, course: Course) -> None:
        if is_instance_course(course) and course.teacher_id is not None:
            sync_homework_monitoring(self.db, course.organization_id, teacher_id=course.teacher_id)

    def _resolve_question_type_id(self, question_type: str) -> int:
        repo = QuestionTypeRepository(self.db)
        record = repo.get_by_name(question_type)
        if record is None:
            record = repo.create(question_type)
        return record.id

    def _normalize_questions_payload(self, questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        for index, question in enumerate(questions, start=1):
            options = question.get("options") or []
            if question.get("type") == "text":
                answers = [
                    {"text": str(answer).strip(), "is_right": True}
                    for answer in (question.get("answer") or [])
                    if str(answer).strip()
                ]
            else:
                selected = {str(answer).strip() for answer in (question.get("answer") or []) if str(answer).strip()}
                answers = []
                for option in options:
                    value = str(option.get("value") if isinstance(option, dict) else option).strip()
                    text = str(option.get("text") if isinstance(option, dict) else option).strip()
                    if not value:
                        continue
                    answers.append(
                        {
                            "text": value,
                            "is_right": value in selected or text in selected,
                        }
                    )
            normalized.append(
                {
                    "front_id": question.get("uiId") or question.get("front_id") or f"question-{index}",
                    "number": int(question.get("number") or index),
                    "text": str(question.get("text") or ""),
                    "type_id": self._resolve_question_type_id(str(question.get("type") or "text")),
                    "answers": answers,
                }
            )
        return normalized

    @staticmethod
    def _parse_optional_module_id(module_id: str | None) -> tuple[bool, int | None]:
        if module_id is None:
            return False, None

        value = module_id.strip()
        if value == "" or value.lower() == "null":
            return True, None

        try:
            return True, int(value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="module_id must be an integer",
            ) from exc

    @staticmethod
    def _parse_optional_int(field_name: str, raw_value: str | None) -> tuple[bool, int | None]:
        if raw_value is None:
            return False, None
        value = raw_value.strip()
        if value == "":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} must be an integer",
            )
        try:
            return True, int(value)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} must be an integer",
            ) from exc

    @staticmethod
    def _ensure_module_belongs_to_course(
        module_repo: CourseModuleRepository,
        *,
        course_id: int,
        module_id: int | None,
    ) -> None:
        if module_id is None:
            return
        module = module_repo.get(module_id)
        if module is None or module.course_id != course_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    @staticmethod
    def _resolve_removed_ids(raw_ids: list[str] | None) -> list[int]:
        if not raw_ids:
            return []
        resolved: list[int] = []
        for raw in raw_ids:
            if raw is None:
                continue
            parts = [piece.strip() for piece in raw.split(",")]
            for part in parts:
                if part == "":
                    continue
                try:
                    resolved.append(int(part))
                except ValueError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="removed_material_ids must contain integers",
                    ) from exc
        return resolved

    @staticmethod
    def _extract_material_homework_text(lesson: CourseLesson | None) -> str | None:
        if lesson is None:
            return None
        for material in lesson.materials:
            if material.homework_text:
                return material.homework_text
        return None

    @staticmethod
    def _copy_material_files(
        source_lesson: CourseLesson,
        file_repo: FileRepository,
        *,
        material_id: int,
        course_id: int,
        lesson_id: int,
    ) -> None:
        for material in source_lesson.materials:
            for source_file in material.files:
                try:
                    copied_path = copy_stored_file(
                        source_file.path,
                        "course-materials",
                        str(course_id),
                        str(lesson_id),
                    )
                except HTTPException:
                    copied_path = source_file.path
                record = file_repo.create(
                    path=copied_path,
                    material_id=material_id,
                    name=source_file.name,
                    size=source_file.size,
                    url="",
                )
                file_repo.update(record.id, url=f"/api/v1/files/course-materials/{record.id}")

    @staticmethod
    def _create_material_file_record(
        upload: UploadFile,
        file_repo: FileRepository,
        *,
        course_id: int,
        lesson_id: int,
        material_id: int,
    ) -> None:
        stored_file = save_upload_file(upload, "course-materials", str(course_id), str(lesson_id))
        record = file_repo.create(
            path=stored_file.relative_path,
            material_id=material_id,
            name=stored_file.original_name,
            size=stored_file.size,
            url="",
        )
        file_repo.update(record.id, url=f"/api/v1/files/course-materials/{record.id}")

    @staticmethod
    def _delete_material_file_record(file_repo: FileRepository, file_id: int) -> None:
        file = file_repo.get(file_id)
        if file is None:
            return

        stored_path = file.path
        file_repo.delete(file_id)
        if stored_path and not any(item.path == stored_path for item in file_repo.list()):
            remove_stored_file(stored_path)

    def _refresh_template_course_limits(self, course: Course) -> None:
        if course.kind == "instance":
            return
        max_module_number = max((module.module_number for module in course.modules), default=0)
        self.course_repo.update(course.id, max_modules_count=max_module_number)
