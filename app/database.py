from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Default to a local SQLite database; override with DATABASE_URL env if needed.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
