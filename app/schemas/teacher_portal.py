from __future__ import annotations

from pydantic import BaseModel


class HomeworkReviewRequest(BaseModel):
    status: str = "pending"
    feedback: str = ""
