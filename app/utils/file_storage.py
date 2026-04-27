from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.config import settings

CHUNK_SIZE = 1024 * 1024


@dataclass(slots=True)
class StoredUpload:
    original_name: str
    relative_path: str
    size: int


def _upload_root() -> Path:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _client_filename(upload: UploadFile) -> str:
    raw_name = (upload.filename or "file").replace("\\", "/")
    filename = Path(raw_name).name.strip()
    return filename or "file"


def _validate_extension(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    allowed = settings.upload_allowed_extensions
    if allowed and extension not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type",
        )
    return extension


def save_upload_file(upload: UploadFile, *scope: str) -> StoredUpload:
    original_name = _client_filename(upload)
    extension = _validate_extension(original_name)
    storage_name = f"{uuid4().hex}{extension}"

    directory = _upload_root().joinpath(*[part for part in scope if part])
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / storage_name

    size = 0
    try:
        upload.file.seek(0)
        with destination.open("wb") as output:
            while True:
                chunk = upload.file.read(CHUNK_SIZE)
                if not chunk:
                    break
                size += len(chunk)
                if size > settings.upload_max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File is too large",
                    )
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        upload.file.seek(0)

    relative_path = destination.relative_to(_upload_root()).as_posix()
    return StoredUpload(original_name=original_name, relative_path=relative_path, size=size)


def resolve_stored_path(relative_path: str | None) -> Path:
    if not relative_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    root = _upload_root().resolve()
    path = (root / relative_path).resolve()
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc

    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return path


def remove_stored_file(relative_path: str | None) -> None:
    if not relative_path:
        return

    root = _upload_root().resolve()
    path = (root / relative_path).resolve()
    try:
        path.relative_to(root)
    except ValueError:
        return
    if path.is_file():
        path.unlink()
    for parent in path.parents:
        if parent == root:
            break
        try:
            parent.rmdir()
        except OSError:
            break


def copy_stored_file(source_relative_path: str, *scope: str) -> str:
    source = resolve_stored_path(source_relative_path)
    directory = _upload_root().joinpath(*[part for part in scope if part])
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / f"{uuid4().hex}{source.suffix.lower()}"
    shutil.copyfile(source, destination)
    return destination.relative_to(_upload_root()).as_posix()
