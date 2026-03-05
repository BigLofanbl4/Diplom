from pydantic import BaseModel, ConfigDict
from typing import Optional, List

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

class GroupBase(BaseModel):
    group_number: int
    model_config = ConfigDict(from_attributes=True)

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    model_config = ConfigDict(from_attributes=True)

class GroupSimple(GroupBase):
    id: int

class StudentSimple(StudentBase):
    id: int

class GroupCreate(GroupBase):
    student_ids: Optional[List[int]] = []

class StudentCreate(StudentBase):
    group_ids: Optional[List[int]] = []

class GroupOut(GroupSimple):
    students: List[StudentSimple] = []

class StudentOut(StudentSimple):
    groups: List[GroupSimple] = []

class GroupUpdate(BaseModel):
    group_number: Optional[int] = None
    student_ids: Optional[List[int]] = None
    model_config = ConfigDict(from_attributes=True)

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    group_ids: Optional[List[int]] = None
    model_config = ConfigDict(from_attributes=True)
