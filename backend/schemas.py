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
    login: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    is_ovz: Optional[bool] = None
    phone: Optional[str] = None
