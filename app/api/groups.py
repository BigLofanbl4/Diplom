from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories import GroupRepository
from app.schemas import GroupCreate, GroupUpdate

router = APIRouter(prefix="/groups", tags=["groups"])


def _group_to_dict(group) -> dict[str, Any]:
    return {
        "id": group.id,
        "group_number": group.group_number,
        "course_id": group.course_id,
        "teacher_id": group.teacher_id,
        "teacher": (
            {
                "id": group.teacher.id,
                "first_name": group.teacher.first_name,
                "last_name": group.teacher.last_name,
            }
            if group.teacher
            else None
        ),
        "students": [{"id": s.id, "first_name": s.first_name, "last_name": s.last_name} for s in group.students],
    }


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(payload)
    if "group_number" in normalized and normalized["group_number"] is not None:
        normalized["group_number"] = str(normalized["group_number"])
    if "course_id" not in normalized:
        normalized["course_id"] = None
    return normalized


@router.get("")
def read_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    groups = GroupRepository(db).get_groups(skip, limit)
    return [_group_to_dict(group) for group in groups]


@router.get("/{group_id}")
def read_group(group_id: int, db: Session = Depends(get_db)):
    group = GroupRepository(db).get_group_by_id(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return _group_to_dict(group)


@router.post("")
def create_group(payload: dict[str, Any], db: Session = Depends(get_db)):
    data = _normalize_payload(payload)
    group = GroupRepository(db).create_group(GroupCreate(**data))
    return _group_to_dict(group)


@router.patch("/{group_id}")
def update_group(group_id: int, payload: dict[str, Any], db: Session = Depends(get_db)):
    data = _normalize_payload(payload)
    group = GroupRepository(db).update_group(group_id, GroupUpdate(**data))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return _group_to_dict(group)


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    success = GroupRepository(db).delete_group(group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Group not found")
    return None
