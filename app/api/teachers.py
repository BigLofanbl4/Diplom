from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.organization import User
from ..models.teachers import Teacher
from ..repositories import GroupRepository, TeacherRepository
from ..schemas import GroupRef
from ..utils.api_errors import forbidden, not_found
from .auth import get_current_user

router = APIRouter(prefix='/teachers', tags=['teachers'])


class TeachersListMeta(BaseModel):
    totals: int
    limit: int
    offset: int
    search: str | None = None


class TeacherListItem(BaseModel):
    id: int
    login: str
    phone: str | None = None
    first_name: str
    last_name: str
    age: int | None = None
    is_ovz: bool
    organization_id: int
    groups_count: int
    model_config = ConfigDict(from_attributes=True)


class TeachersListResponse(BaseModel):
    data: list[TeacherListItem]
    meta: TeachersListMeta


class TeacherCreateRequest(BaseModel):
    first_name: str
    last_name: str
    login: str
    password: str
    phone: str | None = None
    age: int | None = Field(default=None, ge=0)
    birth_date: date | None = None
    is_ovz: bool = False
    organization_id: int | None = None
    group_ids: list[int] = Field(default_factory=list)


class TeacherUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    login: str | None = None
    password: str | None = None
    phone: str | None = None
    age: int | None = Field(default=None, ge=0)
    birth_date: date | None = None
    is_ovz: bool | None = None
    organization_id: int | None = None
    group_ids: list[int] | None = None


class TeacherDetail(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str | None = None
    age: int | None = None
    birth_date: date | None = None
    is_ovz: bool
    organization_id: int
    login: str
    group_ids: list[int]
    groups: list[GroupRef]
    model_config = ConfigDict(from_attributes=True)


def _birth_date_from_age(age: int) -> date:
    today = date.today()
    try:
        return today.replace(year=today.year - age)
    except ValueError:
        # Handle Feb 29 for non-leap target years.
        return today.replace(month=2, day=28, year=today.year - age)


def _resolve_birth_date(birth_date: date | None, age: int | None) -> date | None:
    if age is not None:
        return _birth_date_from_age(age)
    return birth_date


def _get_scoped_teacher_or_404(repo: TeacherRepository, teacher_id: int, user: User) -> Teacher:
    teacher = repo.get(teacher_id)
    if teacher is None or teacher.user is None or teacher.user.organization_id != user.organization_id:
        raise not_found("Teacher not found")
    return teacher


def _to_teacher_list_item(teacher: Teacher) -> TeacherListItem:
    organization_id = teacher.user.organization_id if teacher.user is not None else 0
    login = teacher.user.login if teacher.user is not None else ""
    return TeacherListItem(
        id=teacher.id,
        login=login,
        phone=teacher.phone,
        first_name=teacher.first_name,
        last_name=teacher.last_name,
        age=teacher.age,
        is_ovz=teacher.is_ovz,
        organization_id=organization_id,
        groups_count=len(teacher.groups),
    )


def _to_teacher_detail(teacher: Teacher) -> TeacherDetail:
    organization_id = teacher.user.organization_id if teacher.user is not None else 0
    login = teacher.user.login if teacher.user is not None else ""
    groups = [GroupRef.model_validate(group) for group in teacher.groups]
    return TeacherDetail(
        id=teacher.id,
        first_name=teacher.first_name,
        last_name=teacher.last_name,
        phone=teacher.phone,
        age=teacher.age,
        birth_date=teacher.birth_date,
        is_ovz=teacher.is_ovz,
        organization_id=organization_id,
        login=login,
        group_ids=[group.id for group in teacher.groups],
        groups=groups,
    )


def _validate_group_ids(db: Session, group_ids: list[int] | None, organization_id: int) -> None:
    if group_ids is None:
        return
    repo = GroupRepository(db)
    for group_id in group_ids:
        group = repo.get(group_id)
        if group is None or group.organization_id != organization_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")


def _resolve_organization_id(
        provided_org_id: int | None,
        current_user: User,
) -> int:
    if provided_org_id is None:
        return current_user.organization_id
    if provided_org_id != current_user.organization_id:
        raise forbidden()
    return provided_org_id


@router.get('/', response_model=TeachersListResponse)
def list_teachers(
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
        limit: Annotated[int, Query(ge=1, le=200)] = 50,
        offset: Annotated[int, Query(ge=0)] = 0,
        search: str | None = None,
) -> TeachersListResponse:
    teachers = TeacherRepository(db).list(organization_id=current_user.organization_id)
    teachers = sorted(teachers, key=lambda item: item.id)

    if search:
        term = search.lower()
        teachers = [
            teacher for teacher in teachers
            if term in teacher.first_name.lower()
            or term in teacher.last_name.lower()
            or (teacher.user is not None and term in teacher.user.login.lower())
            or (teacher.phone is not None and term in teacher.phone.lower())
        ]

    totals = len(teachers)
    page = teachers[offset:offset + limit]
    return TeachersListResponse(
        data=[_to_teacher_list_item(teacher) for teacher in page],
        meta=TeachersListMeta(totals=totals, limit=limit, offset=offset, search=search),
    )


@router.get('/{teacher_id}', response_model=TeacherDetail)
def get_teacher(
        teacher_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TeacherDetail:
    teacher = _get_scoped_teacher_or_404(TeacherRepository(db), teacher_id, current_user)
    return _to_teacher_detail(teacher)


@router.post('/', response_model=TeacherDetail, status_code=status.HTTP_201_CREATED)
def create_teacher(
        data: TeacherCreateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TeacherDetail:
    organization_id = _resolve_organization_id(data.organization_id, current_user)
    _validate_group_ids(db, data.group_ids, organization_id)

    repo = TeacherRepository(db)
    try:
        teacher = repo.create(
            login=data.login,
            password=data.password,
            organization_id=organization_id,
            first_name=data.first_name,
            last_name=data.last_name,
            birth_date=_resolve_birth_date(data.birth_date, data.age),
            phone=data.phone,
            is_ovz=data.is_ovz,
            group_ids=data.group_ids,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    reloaded = repo.get(teacher.id)
    if reloaded is None:
        raise not_found("Teacher not found")
    return _to_teacher_detail(reloaded)


@router.patch('/{teacher_id}', response_model=TeacherDetail)
def update_teacher(
        teacher_id: int,
        data: TeacherUpdateRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> TeacherDetail:
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

    repo = TeacherRepository(db)
    _get_scoped_teacher_or_404(repo, teacher_id, current_user)

    provided_org_id = payload.get("organization_id")
    organization_id = (
        _resolve_organization_id(provided_org_id, current_user)
        if "organization_id" in payload
        else None
    )
    _validate_group_ids(db, payload.get("group_ids"), current_user.organization_id)

    birth_date = payload.get("birth_date")
    if "age" in payload and payload.get("age") is not None:
        birth_date = _birth_date_from_age(payload["age"])

    try:
        teacher = repo.update(
            teacher_id,
            login=payload.get("login"),
            password=payload.get("password"),
            organization_id=organization_id,
            first_name=payload.get("first_name"),
            last_name=payload.get("last_name"),
            birth_date=birth_date,
            phone=payload.get("phone"),
            is_ovz=payload.get("is_ovz"),
            group_ids=payload.get("group_ids"),
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    if teacher is None:
        raise not_found("Teacher not found")
    return _to_teacher_detail(teacher)


@router.delete('/{teacher_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
        teacher_id: int,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    repo = TeacherRepository(db)
    _get_scoped_teacher_or_404(repo, teacher_id, current_user)
    repo.delete(teacher_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
