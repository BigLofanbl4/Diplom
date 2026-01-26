from pydantic import BaseModel
from typing import Optional

class TeacherBase(BaseModel):
    login: str
    phone: Optional[str] = None
    first_name: str
    last_name: str
    age: Optional[int] = None
    is_ovz: bool = False
    organization_id: Optional[int] = None

class TeacherCreate(TeacherBase):
    password: str

class TeacherOut(TeacherBase):
    id: int

    class Config:
        from_attributes = True

class TeacherUpdate(BaseModel):
    login: str
    password: str
    first_name: str
    last_name: str
    age: int
    is_ovz: bool
    phone: str
