from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File as FastAPIFile, Form, HTTPException, Response, UploadFile, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.courses import Course, CourseLesson, CourseModule
from ..models.organization import User
from ..repositories import (
    CourseLessonRepository,
    CourseMaterialRepository,
    CourseModuleRepository,
    CourseRepository,
    FileRepository,
    QuestionTypeRepository,
    TestRepository,
)
from ..services.homework_monitoring import sync_homework_monitoring
from ..utils.api_errors import not_found
from ..utils.course_instances import (
    clone_template_test,
    ensure_course_instance,
    find_template_lesson,
    find_template_module,
    find_template_course,
    is_instance_course,
)
from ..utils.file_storage import copy_stored_file, remove_stored_file, save_upload_file
from ..utils.serializers import serialize_course, serialize_course_detail, serialize_lesson, serialize_test
from .auth import get_current_user

router = APIRouter(prefix='/courses', tags=['courses'])


class CourseCreateRequest(BaseModel):
    title: str
    description: str | None = None


class CourseUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None


class CourseListItem(BaseModel):
    id: int
    title: str
    description: str | None = None
    kind: str | None = None
    template_course_id: int | None = None
    group_id: int | None = None
    teacher_id: int | None = None
    max_modules_count: int | None = None
    model_config = ConfigDict(from_attributes=True)


class CoursesListResponse(BaseModel):
    data: list[CourseListItem]


class CourseModuleOut(BaseModel):
    id: int
    title: str
    module_number: int
    course_id: int
    model_config = ConfigDict(from_attributes=True)


class CourseLessonShortOut(BaseModel):
    id: int
    title: str
    lesson_number: int
    description: str | None = None
    homework_text: str | None = None
    course_id: int
    module_id: int | None = None
    test_id: int | None = None
    materials: list[dict] = []
    model_config = ConfigDict(from_attributes=True)


class CourseDetail(BaseModel):
    id: int
    title: str
    description: str | None = None
    kind: str | None = None
    template_course_id: int | None = None
    group_id: int | None = None
    teacher_id: int | None = None
    max_modules_count: int | None = None
    template_course: dict | None = None
    template_modules: list[CourseModuleOut] = []
    template_lessons: list[CourseLessonShortOut] = []
    modules: list[CourseModuleOut]
    lessons: list[CourseLessonShortOut]
    model_config = ConfigDict(from_attributes=True, extra="allow")


class CourseModuleCreateRequest(BaseModel):
    title: str | None = None
    module_number: int


class CourseModuleUpdateRequest(BaseModel):
    title: str | None = None
    module_number: int | None = None


class LessonMaterialOut(BaseModel):
    id: int
    name: str
    size: int
    url: str
    model_config = ConfigDict(from_attributes=True)


class CourseLessonOut(BaseModel):
    id: int
    title: str
    lesson_number: int
    description: str | None = None
    homework_text: str | None = None
    course_id: int
    module_id: int | None = None
    test_id: int | None = None
    materials: list[LessonMaterialOut]
    model_config = ConfigDict(from_attributes=True)


class TestOut(BaseModel):
    id: int
    title: str
    questions_number: int
    questions: list[dict]


def _get_scoped_course_or_404(repo: CourseRepository, course_id: int, user: User) -> Course:
    course = repo.get(course_id)
    if course is None or course.organization_id != user.organization_id:
        raise not_found('Course not found')
    return course


def _get_scoped_module_or_404(
        module_repo: CourseModuleRepository,
        *,
        course_id: int,
        module_id: int,
        course_exists: bool,
) -> CourseModule:
    if not course_exists:
        raise not_found('Course not found')
    module = module_repo.get(module_id)
    if module is None or module.course_id != course_id:
        raise not_found('Module not found')
    return module


def _get_scoped_lesson_or_404(
        lesson_repo: CourseLessonRepository,
        *,
        course_id: int,
        lesson_id: int,
        course_exists: bool,
) -> CourseLesson:
    if not course_exists:
        raise not_found('Course not found')
    lesson = lesson_repo.get(lesson_id)
    if lesson is None or lesson.course_id != course_id:
        raise not_found('Lesson not found')
    return lesson


def _serialize_course_detail(course: Course, repo: CourseRepository) -> CourseDetail:
    return CourseDetail.model_validate(serialize_course_detail(course, repo))


def _serialize_lesson(lesson: CourseLesson) -> CourseLessonOut:
    return CourseLessonOut.model_validate(serialize_lesson(lesson))


def _sync_homework_monitoring_for_course(db: Session, course: Course) -> None:
    if is_instance_course(course) and course.teacher_id is not None:
        sync_homework_monitoring(db, course.organization_id, teacher_id=course.teacher_id)


def _resolve_question_type_id(db: Session, question_type: str) -> int:
    repo = QuestionTypeRepository(db)
    record = repo.get_by_name(question_type)
    if record is None:
        record = repo.create(question_type)
    return record.id


def _normalize_questions_payload(db: Session, questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
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
                "type_id": _resolve_question_type_id(db, str(question.get("type") or "text")),
                "answers": answers,
            }
        )
    return normalized


def _parse_optional_module_id(module_id: str | None) -> tuple[bool, int | None]:
    if module_id is None:
        return False, None

    value = module_id.strip()
    if value == '' or value.lower() == 'null':
        return True, None

    try:
        return True, int(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='module_id must be an integer',
        ) from exc


def _parse_optional_int(field_name: str, raw_value: str | None) -> tuple[bool, int | None]:
    if raw_value is None:
        return False, None
    value = raw_value.strip()
    if value == '':
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'{field_name} must be an integer',
        )
    try:
        return True, int(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'{field_name} must be an integer',
        ) from exc


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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')


def _resolve_removed_ids(raw_ids: list[str] | None) -> list[int]:
    if not raw_ids:
        return []
    resolved: list[int] = []
    for raw in raw_ids:
        if raw is None:
            continue
        parts = [piece.strip() for piece in raw.split(',')]
        for part in parts:
            if part == '':
                continue
            try:
                resolved.append(int(part))
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail='removed_material_ids must contain integers',
                ) from exc
    return resolved


def _extract_material_homework_text(lesson: CourseLesson | None) -> str | None:
    if lesson is None:
        return None
    for material in lesson.materials:
        if material.homework_text:
            return material.homework_text
    return None


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


def _delete_material_file_record(file_repo: FileRepository, file_id: int) -> None:
    file = file_repo.get(file_id)
    if file is None:
        return

    stored_path = file.path
    file_repo.delete(file_id)
    if stored_path and not any(item.path == stored_path for item in file_repo.list()):
        remove_stored_file(stored_path)


def _refresh_template_course_limits(course: Course, repo: CourseRepository) -> None:
    if course.kind == "instance":
        return
    max_module_number = max((module.module_number for module in course.modules), default=0)
    repo.update(course.id, max_modules_count=max_module_number)


@router.get('', response_model=CoursesListResponse)
def list_courses(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CoursesListResponse:
    repo = CourseRepository(db)
    courses = [
        course for course in repo.list(organization_id=current_user.organization_id)
        if course.kind != "instance"
    ]
    courses = sorted(courses, key=lambda item: item.id)
    return CoursesListResponse(
        data=[CourseListItem.model_validate(serialize_course(course, repo)) for course in courses],
    )


@router.get('/{course_id}', response_model=CourseDetail)
def get_course(
        course_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseDetail:
    repo = CourseRepository(db)
    course = _get_scoped_course_or_404(repo, course_id, current_user)
    return _serialize_course_detail(course, repo)


@router.post('', response_model=CourseListItem, status_code=status.HTTP_201_CREATED)
def create_course(
        data: CourseCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseListItem:
    repo = CourseRepository(db)
    try:
        course = repo.create(
            title=data.title,
            description=data.description,
            organization_id=current_user.organization_id,
            kind="template",
            max_modules_count=0,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
    return CourseListItem.model_validate(serialize_course(course, repo))


@router.patch('/{course_id}', response_model=CourseListItem)
def update_course(
        course_id: int,
        data: CourseUpdateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseListItem:
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='No fields to update')

    repo = CourseRepository(db)
    _get_scoped_course_or_404(repo, course_id, current_user)
    try:
        updated = repo.update(
            course_id,
            title=payload.get('title'),
            description=payload.get('description'),
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    if updated is None:
        raise not_found('Course not found')
    return CourseListItem.model_validate(serialize_course(updated, repo))


@router.delete('/{course_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
        course_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    repo = CourseRepository(db)
    _get_scoped_course_or_404(repo, course_id, current_user)
    repo.delete(course_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get('/{course_id}/modules', response_model=list[CourseModuleOut])
def list_course_modules(
        course_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> list[CourseModuleOut]:
    _get_scoped_course_or_404(CourseRepository(db), course_id, current_user)
    modules = CourseModuleRepository(db).list(course_id=course_id)
    modules = sorted(modules, key=lambda item: (item.module_number, item.id))
    return [CourseModuleOut.model_validate(module) for module in modules]


@router.get('/{course_id}/modules/{module_id}', response_model=CourseModuleOut)
def get_course_module(
        course_id: int,
        module_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseModuleOut:
    course_exists = _get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None
    module = _get_scoped_module_or_404(
        CourseModuleRepository(db),
        course_id=course_id,
        module_id=module_id,
        course_exists=course_exists,
    )
    return CourseModuleOut.model_validate(module)


@router.post('/{course_id}/modules', response_model=CourseModuleOut, status_code=status.HTTP_201_CREATED)
def create_course_module(
        course_id: int,
        data: CourseModuleCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseModuleOut:
    course_repo = CourseRepository(db)
    module_repo = CourseModuleRepository(db)
    course = _get_scoped_course_or_404(course_repo, course_id, current_user)

    title = data.title
    if is_instance_course(course):
        template_module = find_template_module(course, data.module_number, course_repo)
        if template_module is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
        title = title or template_module.title
    elif not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    try:
        module = module_repo.create(
            title=title,
            module_number=data.module_number,
            course_id=course_id,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    course = course_repo.get(course.id) or course
    _refresh_template_course_limits(course, course_repo)
    return CourseModuleOut.model_validate(module)


@router.patch('/{course_id}/modules/{module_id}', response_model=CourseModuleOut)
def update_course_module(
        course_id: int,
        module_id: int,
        data: CourseModuleUpdateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseModuleOut:
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='No fields to update')

    course_repo = CourseRepository(db)
    module_repo = CourseModuleRepository(db)
    course = _get_scoped_course_or_404(course_repo, course_id, current_user)
    course_exists = course is not None
    _get_scoped_module_or_404(
        module_repo,
        course_id=course_id,
        module_id=module_id,
        course_exists=course_exists,
    )

    next_title = payload.get("title")
    next_number = payload.get("module_number")
    if is_instance_course(course) and next_number is not None:
        template_module = find_template_module(course, next_number, course_repo)
        if template_module is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
        if not next_title:
            next_title = template_module.title

    try:
        module = module_repo.update(
            module_id,
            title=next_title,
            module_number=next_number,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    if module is None:
        raise not_found('Module not found')
    refreshed_course = course_repo.get(course.id) or course
    _refresh_template_course_limits(refreshed_course, course_repo)
    return CourseModuleOut.model_validate(module)


@router.delete('/{course_id}/modules/{module_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_course_module(
        course_id: int,
        module_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    course_repo = CourseRepository(db)
    course = _get_scoped_course_or_404(course_repo, course_id, current_user)
    repo = CourseModuleRepository(db)
    _get_scoped_module_or_404(repo, course_id=course_id, module_id=module_id, course_exists=True)
    repo.delete(module_id)
    refreshed_course = course_repo.get(course.id) or course
    _refresh_template_course_limits(refreshed_course, course_repo)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get('/{course_id}/lessons', response_model=list[CourseLessonOut])
def list_course_lessons(
        course_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> list[CourseLessonOut]:
    _get_scoped_course_or_404(CourseRepository(db), course_id, current_user)
    lessons = CourseLessonRepository(db).list(course_id=course_id)
    lessons = sorted(lessons, key=lambda item: (item.module_id or 0, item.lesson_number, item.id))
    return [_serialize_lesson(lesson) for lesson in lessons]


@router.get('/{course_id}/lessons/{lesson_id}', response_model=CourseLessonOut)
def get_course_lesson(
        course_id: int,
        lesson_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseLessonOut:
    lesson = _get_scoped_lesson_or_404(
        CourseLessonRepository(db),
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=_get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None,
    )
    return _serialize_lesson(lesson)


@router.post('/{course_id}/lessons', response_model=CourseLessonOut, status_code=status.HTTP_201_CREATED)
def create_course_lesson(
        course_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        title: Annotated[str | None, Form()] = None,
        lesson_number: Annotated[int, Form()] = 1,
        description: Annotated[str | None, Form()] = None,
        homework_text: Annotated[str | None, Form()] = None,
        module_id_raw: Annotated[str | None, Form(alias='module_id')] = None,
        materials: Annotated[list[UploadFile] | None, FastAPIFile(alias='materials')] = None,
) -> CourseLessonOut:
    course_repo = CourseRepository(db)
    course = _get_scoped_course_or_404(course_repo, course_id, current_user)
    module_id_set, module_id = _parse_optional_module_id(module_id_raw)
    if not module_id_set:
        module_id = None
    _ensure_module_belongs_to_course(CourseModuleRepository(db), course_id=course_id, module_id=module_id)

    module = CourseModuleRepository(db).get(module_id) if module_id is not None else None
    template_lesson = None
    resolved_title = title
    resolved_description = description
    resolved_homework_text = homework_text

    if is_instance_course(course):
        if module is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
        template_lesson = find_template_lesson(course, module.module_number, lesson_number, course_repo)
        if template_lesson is not None:
            resolved_title = resolved_title or template_lesson.title
            resolved_description = resolved_description or template_lesson.description
            if resolved_homework_text is None:
                resolved_homework_text = _extract_material_homework_text(template_lesson)

    if not resolved_title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    lesson_repo = CourseLessonRepository(db)
    material_repo = CourseMaterialRepository(db)
    file_repo = FileRepository(db)

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
                _copy_material_files(
                    template_lesson,
                    file_repo,
                    material_id=material.id,
                    course_id=course_id,
                    lesson_id=lesson.id,
                )
            for upload in materials or []:
                _create_material_file_record(
                    upload,
                    file_repo,
                    course_id=course_id,
                    lesson_id=lesson.id,
                    material_id=material.id,
                )

        if template_lesson is not None and template_lesson.test is not None:
            clone_template_test(template_lesson.test, course_id, lesson.id, TestRepository(db))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    reloaded = lesson_repo.get(lesson.id)
    if reloaded is None:
        raise not_found('Lesson not found')
    _sync_homework_monitoring_for_course(db, course)
    return _serialize_lesson(reloaded)


@router.patch('/{course_id}/lessons/{lesson_id}', response_model=CourseLessonOut)
def update_course_lesson(
        course_id: int,
        lesson_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        title: Annotated[str | None, Form()] = None,
        lesson_number_raw: Annotated[str | None, Form(alias='lesson_number')] = None,
        description: Annotated[str | None, Form()] = None,
        homework_text: Annotated[str | None, Form()] = None,
        module_id_raw: Annotated[str | None, Form(alias='module_id')] = None,
        removed_material_ids_raw: Annotated[list[str] | None, Form(alias='removed_material_ids')] = None,
        materials: Annotated[list[UploadFile] | None, FastAPIFile(alias='materials')] = None,
) -> CourseLessonOut:
    lesson_repo = CourseLessonRepository(db)
    lesson = _get_scoped_lesson_or_404(
        lesson_repo,
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=_get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None,
    )

    lesson_number_set, lesson_number = _parse_optional_int('lesson_number', lesson_number_raw)
    module_id_set, module_id = _parse_optional_module_id(module_id_raw)
    if module_id_set:
        _ensure_module_belongs_to_course(CourseModuleRepository(db), course_id=course_id, module_id=module_id)

    removed_material_ids = _resolve_removed_ids(removed_material_ids_raw)
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
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='No fields to update')

    material_repo = CourseMaterialRepository(db)
    file_repo = FileRepository(db)
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
                    _delete_material_file_record(file_repo, file_id)

        if should_add_files:
            if default_material is None:
                default_material = material_repo.create(course_id=course_id, lesson_id=lesson_id)
            for upload in materials or []:
                _create_material_file_record(
                    upload,
                    file_repo,
                    course_id=course_id,
                    lesson_id=lesson_id,
                    material_id=default_material.id,
                )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    if updated is None:
        raise not_found('Lesson not found')
    reloaded = lesson_repo.get(lesson_id)
    if reloaded is None:
        raise not_found('Lesson not found')
    course = CourseRepository(db).get(course_id)
    if course is not None:
        _sync_homework_monitoring_for_course(db, course)
    return _serialize_lesson(reloaded)


@router.delete('/{course_id}/lessons/{lesson_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_course_lesson(
        course_id: int,
        lesson_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    course = _get_scoped_course_or_404(CourseRepository(db), course_id, current_user)
    repo = CourseLessonRepository(db)
    _get_scoped_lesson_or_404(
        repo,
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=course is not None,
    )
    repo.delete(lesson_id)
    _sync_homework_monitoring_for_course(db, course)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get('/{course_id}/lessons/{lesson_id}/test', response_model=TestOut)
def get_lesson_test(
        course_id: int,
        lesson_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TestOut:
    _get_scoped_lesson_or_404(
        CourseLessonRepository(db),
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=_get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None,
    )
    tests = TestRepository(db).list(course_id=course_id, lesson_id=lesson_id)
    test = tests[0] if tests else None
    if test is None:
        raise not_found('Test not found')
    return TestOut.model_validate(serialize_test(test))


@router.post('/{course_id}/lessons/{lesson_id}/test', response_model=TestOut, status_code=status.HTTP_201_CREATED)
def create_lesson_test(
        course_id: int,
        lesson_id: int,
        payload: dict[str, Any],
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TestOut:
    _get_scoped_lesson_or_404(
        CourseLessonRepository(db),
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=_get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None,
    )
    test_repo = TestRepository(db)
    if test_repo.list(course_id=course_id, lesson_id=lesson_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
    try:
        test = test_repo.create(course_id=course_id, title=str(payload.get("title") or ""), lesson_id=lesson_id)
        questions = _normalize_questions_payload(db, list(payload.get("questions") or []))
        updated = test_repo.update(test.id, title=str(payload.get("title") or ""), questions=questions)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
    return TestOut.model_validate(serialize_test(updated or test))


@router.put('/{course_id}/lessons/{lesson_id}/test', response_model=TestOut)
def update_lesson_test(
        course_id: int,
        lesson_id: int,
        payload: dict[str, Any],
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TestOut:
    _get_scoped_lesson_or_404(
        CourseLessonRepository(db),
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=_get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None,
    )
    test_repo = TestRepository(db)
    tests = test_repo.list(course_id=course_id, lesson_id=lesson_id)
    test = tests[0] if tests else None
    if test is None:
        raise not_found('Test not found')
    try:
        updated = test_repo.update(
            test.id,
            title=str(payload.get("title") or ""),
            questions=_normalize_questions_payload(db, list(payload.get("questions") or [])),
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
    if updated is None:
        raise not_found('Test not found')
    return TestOut.model_validate(serialize_test(updated))


@router.delete('/{course_id}/lessons/{lesson_id}/test', status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson_test(
        course_id: int,
        lesson_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _get_scoped_lesson_or_404(
        CourseLessonRepository(db),
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=_get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None,
    )
    test_repo = TestRepository(db)
    tests = test_repo.list(course_id=course_id, lesson_id=lesson_id)
    test = tests[0] if tests else None
    if test is None:
        raise not_found('Test not found')
    test_repo.delete(test.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
