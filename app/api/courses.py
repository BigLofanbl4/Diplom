from __future__ import annotations

from typing import Annotated

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
)
from ..utils.api_errors import not_found
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
    model_config = ConfigDict(from_attributes=True)


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
    course_id: int
    module_id: int | None = None
    model_config = ConfigDict(from_attributes=True)


class CourseDetail(BaseModel):
    id: int
    title: str
    description: str | None = None
    modules: list[CourseModuleOut]
    lessons: list[CourseLessonShortOut]
    model_config = ConfigDict(from_attributes=True)


class CourseModuleCreateRequest(BaseModel):
    title: str
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
    course_id: int
    module_id: int | None = None
    test_id: int | None = None
    materials: list[LessonMaterialOut]
    model_config = ConfigDict(from_attributes=True)


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


def _serialize_course_detail(course: Course) -> CourseDetail:
    modules = sorted(course.modules, key=lambda item: (item.module_number, item.id))
    lessons = sorted(course.lessons, key=lambda item: (item.lesson_number, item.id))
    return CourseDetail(
        id=course.id,
        title=course.title,
        description=course.description,
        modules=[CourseModuleOut.model_validate(module) for module in modules],
        lessons=[CourseLessonShortOut.model_validate(lesson) for lesson in lessons],
    )


def _serialize_lesson(lesson: CourseLesson) -> CourseLessonOut:
    files = []
    for material in lesson.materials:
        files.extend(material.files)
    files = sorted(files, key=lambda item: item.id)
    return CourseLessonOut(
        id=lesson.id,
        title=lesson.title,
        lesson_number=lesson.lesson_number,
        description=lesson.description,
        course_id=lesson.course_id,
        module_id=lesson.module_id,
        test_id=lesson.test.id if lesson.test is not None else None,
        materials=[LessonMaterialOut.model_validate(file) for file in files],
    )


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


@router.get('/', response_model=list[CourseListItem])
def list_courses(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> list[CourseListItem]:
    courses = CourseRepository(db).list(organization_id=current_user.organization_id)
    courses = sorted(courses, key=lambda item: item.id)
    return [CourseListItem.model_validate(course) for course in courses]


@router.get('/{course_id}', response_model=CourseDetail)
def get_course(
        course_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseDetail:
    course = _get_scoped_course_or_404(CourseRepository(db), course_id, current_user)
    return _serialize_course_detail(course)


@router.post('/', response_model=CourseListItem, status_code=status.HTTP_201_CREATED)
def create_course(
        data: CourseCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseListItem:
    try:
        course = CourseRepository(db).create(
            title=data.title,
            description=data.description,
            organization_id=current_user.organization_id,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
    return CourseListItem.model_validate(course)


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
    return CourseListItem.model_validate(updated)


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
    _get_scoped_course_or_404(CourseRepository(db), course_id, current_user)
    try:
        module = CourseModuleRepository(db).create(
            title=data.title,
            module_number=data.module_number,
            course_id=course_id,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')
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

    course_exists = _get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None
    _get_scoped_module_or_404(
        CourseModuleRepository(db),
        course_id=course_id,
        module_id=module_id,
        course_exists=course_exists,
    )
    try:
        module = CourseModuleRepository(db).update(
            module_id,
            title=payload.get('title'),
            module_number=payload.get('module_number'),
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    if module is None:
        raise not_found('Module not found')
    return CourseModuleOut.model_validate(module)


@router.delete('/{course_id}/modules/{module_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_course_module(
        course_id: int,
        module_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    course_exists = _get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None
    repo = CourseModuleRepository(db)
    _get_scoped_module_or_404(repo, course_id=course_id, module_id=module_id, course_exists=course_exists)
    repo.delete(module_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get('/{course_id}/lessons', response_model=list[CourseLessonOut])
def list_course_lessons(
        course_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> list[CourseLessonOut]:
    _get_scoped_course_or_404(CourseRepository(db), course_id, current_user)
    lessons = CourseLessonRepository(db).list(course_id=course_id)
    lessons = sorted(lessons, key=lambda item: (item.lesson_number, item.id))
    return [_serialize_lesson(lesson) for lesson in lessons]


@router.get('/{course_id}/lessons/{lesson_id}', response_model=CourseLessonOut)
def get_course_lesson(
        course_id: int,
        lesson_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> CourseLessonOut:
    course_exists = _get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None
    lesson = _get_scoped_lesson_or_404(
        CourseLessonRepository(db),
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=course_exists,
    )
    return _serialize_lesson(lesson)


@router.post('/{course_id}/lessons', response_model=CourseLessonOut, status_code=status.HTTP_201_CREATED)
def create_course_lesson(
        course_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        title: Annotated[str, Form()],
        lesson_number: Annotated[int, Form()],
        description: Annotated[str | None, Form()] = None,
        homework_text: Annotated[str | None, Form()] = None,
        module_id_raw: Annotated[str | None, Form(alias='module_id')] = None,
        materials: Annotated[list[UploadFile] | None, FastAPIFile(alias='materials')] = None,
) -> CourseLessonOut:
    _get_scoped_course_or_404(CourseRepository(db), course_id, current_user)
    module_id_set, module_id = _parse_optional_module_id(module_id_raw)
    if not module_id_set:
        module_id = None
    _ensure_module_belongs_to_course(CourseModuleRepository(db), course_id=course_id, module_id=module_id)

    lesson_repo = CourseLessonRepository(db)
    material_repo = CourseMaterialRepository(db)
    file_repo = FileRepository(db)

    try:
        lesson = lesson_repo.create(
            title=title,
            lesson_number=lesson_number,
            description=description,
            course_id=course_id,
            module_id=module_id,
        )
        if homework_text is not None or (materials and len(materials) > 0):
            material = material_repo.create(
                course_id=course_id,
                lesson_id=lesson.id,
                homework_text=homework_text,
            )
            for upload in materials or []:
                upload.file.seek(0, 2)
                size = upload.file.tell()
                upload.file.seek(0)
                filename = upload.filename or f'material-{lesson.id}'
                file_repo.create(
                    path=filename,
                    material_id=material.id,
                    name=filename,
                    size=size,
                    url=f'/api/v1/courses/{course_id}/lessons/{lesson.id}/materials/{filename}',
                )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    reloaded = lesson_repo.get(lesson.id)
    if reloaded is None:
        raise not_found('Lesson not found')
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
    course_exists = _get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None
    lesson_repo = CourseLessonRepository(db)
    lesson = _get_scoped_lesson_or_404(
        lesson_repo,
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=course_exists,
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
                default_material = material_repo.create(
                    course_id=course_id,
                    lesson_id=lesson_id,
                    homework_text=homework_text,
                )
            else:
                material_repo.update(default_material.id, homework_text=homework_text)

        if removed_material_ids:
            owned_material_file_ids = {
                file.id for material in lesson_materials for file in material.files
            }
            for file_id in removed_material_ids:
                if file_id in owned_material_file_ids:
                    file_repo.delete(file_id)

        if should_add_files:
            if default_material is None:
                default_material = material_repo.create(
                    course_id=course_id,
                    lesson_id=lesson_id,
                )
            for upload in materials or []:
                upload.file.seek(0, 2)
                size = upload.file.tell()
                upload.file.seek(0)
                filename = upload.filename or f'material-{lesson_id}'
                file_repo.create(
                    path=filename,
                    material_id=default_material.id,
                    name=filename,
                    size=size,
                    url=f'/api/v1/courses/{course_id}/lessons/{lesson_id}/materials/{filename}',
                )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Validation error')

    if updated is None:
        raise not_found('Lesson not found')
    reloaded = lesson_repo.get(lesson_id)
    if reloaded is None:
        raise not_found('Lesson not found')
    return _serialize_lesson(reloaded)


@router.delete('/{course_id}/lessons/{lesson_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_course_lesson(
        course_id: int,
        lesson_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    course_exists = _get_scoped_course_or_404(CourseRepository(db), course_id, current_user) is not None
    repo = CourseLessonRepository(db)
    _get_scoped_lesson_or_404(
        repo,
        course_id=course_id,
        lesson_id=lesson_id,
        course_exists=course_exists,
    )
    repo.delete(lesson_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
