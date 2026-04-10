from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.groups import Group
from ..models.organization import User
from ..repositories import CourseRepository, GroupRepository, StudentRepository, TeacherRepository
from ..schemas import CourseRef, StudentRef, TeacherRef
from ..utils.api_errors import not_found
from .auth import get_current_user

router = APIRouter(prefix='/groups', tags=['groups'])


class GroupsListMeta(BaseModel):
    totals: int
    limit: int
    offset: int
    search: str | None = None


class GroupListItem(BaseModel):
    id: int
    group_number: str
    teacher_id: int | None = None
    course_id: int | None = None
    course: CourseRef | None = None
    students_count: int
    model_config = ConfigDict(from_attributes=True)


class GroupsListResponse(BaseModel):
    data: list[GroupListItem]
    meta: GroupsListMeta


class GroupCreateRequest(BaseModel):
    group_number: str
    teacher_id: int | None = None
    student_ids: list[int] = Field(default_factory=list)
    course_id: int | None = None


class GroupUpdateRequest(BaseModel):
    group_number: str | None = None
    teacher_id: int | None = None
    student_ids: list[int] | None = None
    course_id: int | None = None


class GroupDetail(BaseModel):
    id: int
    group_number: str
    teacher_id: int | None = None
    course_id: int | None = None
    student_ids: list[int]
    teacher: TeacherRef | None = None
    course: CourseRef | None = None
    students: list[StudentRef]
    model_config = ConfigDict(from_attributes=True)


def _get_scoped_group_or_404(repo: GroupRepository, group_id: int, user: User) -> Group:
    group = repo.get(group_id)
    if group is None or group.organization_id != user.organization_id:
        raise not_found("Group not found")
    return group


def _to_group_list_item(group: Group) -> GroupListItem:
    course = CourseRef.model_validate(group.template_course) if group.template_course is not None else None
    return GroupListItem(
        id=group.id,
        group_number=group.group_number,
        teacher_id=group.teacher_id,
        course_id=group.template_course_id,
        course=course,
        students_count=len(group.students),
    )


def _to_group_detail(group: Group) -> GroupDetail:
    teacher = TeacherRef.model_validate(group.teacher) if group.teacher is not None else None
    course = CourseRef.model_validate(group.template_course) if group.template_course is not None else None
    students = [StudentRef.model_validate(student) for student in group.students]
    return GroupDetail(
        id=group.id,
        group_number=group.group_number,
        teacher_id=group.teacher_id,
        course_id=group.template_course_id,
        student_ids=[student.id for student in group.students],
        teacher=teacher,
        course=course,
        students=students,
    )


def _validate_teacher_id(db: Session, teacher_id: int | None, organization_id: int) -> None:
    if teacher_id is None:
        return
    teacher = TeacherRepository(db).get(teacher_id)
    if teacher is None or teacher.user is None or teacher.user.organization_id != organization_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")


def _validate_course_id(db: Session, course_id: int | None, organization_id: int) -> None:
    if course_id is None:
        return
    course = CourseRepository(db).get(course_id)
    if course is None or course.organization_id != organization_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")


def _validate_student_ids(db: Session, student_ids: list[int] | None, organization_id: int) -> None:
    if student_ids is None:
        return
    repo = StudentRepository(db)
    for student_id in student_ids:
        student = repo.get(student_id)
        if student is None or student.user is None or student.user.organization_id != organization_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")


@router.get('/', response_model=GroupsListResponse)
def list_groups(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        limit: Annotated[int, Query(ge=1, le=200)] = 50,
        offset: Annotated[int, Query(ge=0)] = 0,
        search: str | None = None,
) -> GroupsListResponse:
    groups = GroupRepository(db).list(organization_id=current_user.organization_id)
    groups = sorted(groups, key=lambda item: item.id)

    if search:
        term = search.lower()
        groups = [group for group in groups if term in group.group_number.lower()]

    totals = len(groups)
    page = groups[offset:offset + limit]
    return GroupsListResponse(
        data=[_to_group_list_item(group) for group in page],
        meta=GroupsListMeta(totals=totals, limit=limit, offset=offset, search=search),
    )


@router.get('/{group_id}', response_model=GroupDetail)
def get_group(
        group_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
    group = _get_scoped_group_or_404(GroupRepository(db), group_id, current_user)
    return _to_group_detail(group)


@router.post('/', response_model=GroupDetail, status_code=status.HTTP_201_CREATED)
def create_group(
        data: GroupCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
    _validate_teacher_id(db, data.teacher_id, current_user.organization_id)
    _validate_course_id(db, data.course_id, current_user.organization_id)
    _validate_student_ids(db, data.student_ids, current_user.organization_id)

    repo = GroupRepository(db)
    try:
        group = repo.create(
            group_number=data.group_number,
            organization_id=current_user.organization_id,
            teacher_id=data.teacher_id,
            student_ids=data.student_ids,
            course_id=data.course_id,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    reloaded = repo.get(group.id)
    if reloaded is None:
        raise not_found("Group not found")
    return _to_group_detail(reloaded)


@router.patch('/{group_id}', response_model=GroupDetail)
def update_group(
        group_id: int,
        data: GroupUpdateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> GroupDetail:
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

    repo = GroupRepository(db)
    _get_scoped_group_or_404(repo, group_id, current_user)

    _validate_teacher_id(db, payload.get("teacher_id"), current_user.organization_id)
    if "course_id" in payload:
        _validate_course_id(db, payload.get("course_id"), current_user.organization_id)
    _validate_student_ids(db, payload.get("student_ids"), current_user.organization_id)

    try:
        group = repo.update(
            group_id,
            group_number=payload.get("group_number"),
            teacher_id=payload.get("teacher_id"),
            student_ids=payload.get("student_ids"),
            course_id=payload.get("course_id"),
            course_id_set="course_id" in payload,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    if group is None:
        raise not_found("Group not found")
    return _to_group_detail(group)


@router.delete('/{group_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
        group_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    repo = GroupRepository(db)
    _get_scoped_group_or_404(repo, group_id, current_user)
    repo.delete(group_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
