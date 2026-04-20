from __future__ import annotations

from typing import Any, TypeVar

from sqlalchemy.orm import Session

T = TypeVar("T")


class BaseRepository:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _apply_updates(entity: Any, values: dict[str, Any]) -> None:
        for field, value in values.items():
            setattr(entity, field, value)

    def _save(self, entity: T) -> T:
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity
