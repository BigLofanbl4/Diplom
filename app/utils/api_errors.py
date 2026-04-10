from __future__ import annotations

from fastapi import HTTPException, status


INVALID_CREDENTIALS_DETAIL = "Incorrect username or password"
FORBIDDEN_DETAIL = "Not enough permissions"


def not_found(detail: str = "Not found") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail,
    )


def invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=INVALID_CREDENTIALS_DETAIL,
    )


def forbidden(detail: str = FORBIDDEN_DETAIL) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )
