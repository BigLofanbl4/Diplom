from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories import StudentRepository
from app.schemas import StudentCreate, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])


def _student_to_dict(student) -> dict[str, Any]:
    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "phone": student.parent_phone,
        "birth_date": student.birth_date,
        "age": student.age,
        "groups": [{"id": g.id, "group_number": g.group_number} for g in student.groups],
    }


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(payload)
    if "phone" in normalized and "parent_phone" not in normalized:
        normalized["parent_phone"] = normalized.pop("phone")
    return normalized


@router.get("")
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    students = StudentRepository(db).get_students(skip, limit)
    return [_student_to_dict(student) for student in students]


@router.get("/{student_id}")
def read_student(student_id: int, db: Session = Depends(get_db)):
    student = StudentRepository(db).get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return _student_to_dict(student)


@router.post("")
def create_student(payload: dict[str, Any], db: Session = Depends(get_db)):
    data = _normalize_payload(payload)
    student = StudentRepository(db).create_student(StudentCreate(**data))
    return _student_to_dict(student)


@router.patch("/{student_id}")
def update_student(student_id: int, payload: dict[str, Any], db: Session = Depends(get_db)):
    data = _normalize_payload(payload)
    student = StudentRepository(db).update_student(student_id, StudentUpdate(**data))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return _student_to_dict(student)


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    success = StudentRepository(db).delete_student(student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    return None
