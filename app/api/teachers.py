from __future__ import annotations

from datetime import date, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories import TeacherRepository

router = APIRouter(prefix="/teachers", tags=["teachers"])


def _teacher_to_dict(teacher) -> dict[str, Any]:
    return {
        "id": teacher.id,
        "login": teacher.login,
        "phone": teacher.phone,
        "first_name": teacher.first_name,
        "last_name": teacher.last_name,
        "age": teacher.age,
        "is_ovz": teacher.is_ovz,
        "organization_id": teacher.organization_id,
        "groups": [{"id": g.id, "group_number": g.group_number} for g in teacher.groups],
    }


def _birth_date_from_age(age: int | None) -> date | None:
    if age is None or age <= 0:
        return None
    today = date.today()
    return today - timedelta(days=age * 365)


def _normalize_payload(payload: dict[str, Any], partial: bool = False) -> dict[str, Any]:
    normalized = dict(payload)

    if "age" in normalized and "birth_date" not in normalized:
        normalized["birth_date"] = _birth_date_from_age(normalized.get("age"))

    if partial:
        if not normalized.get("password"):
            normalized.pop("password", None)
        return normalized

    normalized.setdefault("organization_id", None)
    normalized.setdefault("group_ids", [])
    normalized.setdefault("is_ovz", False)
    return normalized


@router.get("")
def read_teachers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    teachers = TeacherRepository(db).list(skip=skip, limit=limit)
    return [_teacher_to_dict(teacher) for teacher in teachers]


@router.get("/{teacher_id}")
def read_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = TeacherRepository(db).get_teacher(teacher_id=teacher_id)
    if teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return _teacher_to_dict(teacher)


@router.post("")
def create_teacher(payload: dict[str, Any], db: Session = Depends(get_db)):
    data = _normalize_payload(payload)
    existing = TeacherRepository(db).get_teacher(teacher_login=data["login"])
    if existing:
        raise HTTPException(status_code=400, detail="Login already registered")

    teacher = TeacherRepository(db).create(
        login=data["login"],
        password=data["password"],
        organization_id=data.get("organization_id"),
        first_name=data["first_name"],
        last_name=data["last_name"],
        birth_date=data.get("birth_date"),
        phone=data.get("phone"),
        is_ovz=data.get("is_ovz", False),
        group_ids=data.get("group_ids") or [],
    )
    return _teacher_to_dict(teacher)


@router.patch("/{teacher_id}")
def update_teacher(teacher_id: int, payload: dict[str, Any], db: Session = Depends(get_db)):
    data = _normalize_payload(payload, partial=True)
    teacher = TeacherRepository(db).update_teacher(
        teacher_id=teacher_id,
        login=data.get("login"),
        password=data.get("password"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        birth_date=data.get("birth_date"),
        is_ovz=data.get("is_ovz"),
        phone=data.get("phone"),
        organization_id=data.get("organization_id"),
        group_ids=data.get("group_ids"),
    )
    if teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return _teacher_to_dict(teacher)


@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    success = TeacherRepository(db).delete(teacher_id)
    if not success:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return None


@router.post("/register")
def register_teacher(
    data_login: Annotated[str, Form(alias="login")],
    data_password: Annotated[str, Form(alias="password")],
    data_organization_id: Annotated[int | None, Form(alias="organization_id")] = None,
    data_first_name: Annotated[str, Form(alias="first_name")] = "",
    data_last_name: Annotated[str, Form(alias="last_name")] = "",
    data_birth_date: Annotated[date | None, Form(alias="birth_date")] = None,
    data_phone: Annotated[str | None, Form(alias="phone")] = None,
    db: Session = Depends(get_db),
) -> bool:
    TeacherRepository(db).create(
        login=data_login,
        password=data_password,
        organization_id=data_organization_id,
        first_name=data_first_name,
        last_name=data_last_name,
        birth_date=data_birth_date,
        phone=data_phone,
    )
    return True
