from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient


TEST_ROOT = Path(tempfile.mkdtemp(prefix="diplom-backend-tests-"))
TEST_DB = TEST_ROOT / "app-test.db"
TEST_UPLOADS = TEST_ROOT / "uploads"

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOADS)
os.environ["APP_SECRET_KEY"] = "test-secret-key-for-diplom-api-suite"

from app.database import Base, engine, init_db  # noqa: E402
from app.main import app  # noqa: E402


API_PREFIX = "/api/v1"


@pytest.fixture(autouse=True)
def reset_database() -> None:
    app.dependency_overrides.clear()
    shutil.rmtree(TEST_UPLOADS, ignore_errors=True)
    TEST_UPLOADS.mkdir(parents=True, exist_ok=True)
    Base.metadata.drop_all(bind=engine)
    init_db()
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def login(
    client: TestClient,
    username: str = "admin",
    password: str = "AdminDemo!2026",
) -> dict[str, str]:
    response = client.post(
        f"{API_PREFIX}/auth/login",
        data={"username": username, "password": password},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def response_json(response: Any) -> dict[str, Any]:
    assert response.headers["content-type"].startswith("application/json")
    return response.json()
