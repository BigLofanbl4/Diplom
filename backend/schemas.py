from pydantic import BaseModel, ConfigDict
from typing import Optional, List


# =========== BASE ===========
class TeacherBase(BaseModel):
    login: str
    phone: Optional[str] = None
    first_name: str
    last_name: str
    age: Optional[int] = None
    is_ovz: bool = False
    organization_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class GroupBase(BaseModel):
    group_number: int
    teacher_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    model_config = ConfigDict(from_attributes=True)

# =========== SIMPLE ===========
class TeacherSimple(TeacherBase):
    id: int

class GroupSimple(GroupBase):
    id: int

class StudentSimple(StudentBase):
    id: int

# =========== CREATE ===========
class TeacherCreate(TeacherBase):
    password: str
    group_ids: Optional[List[int]] = []

class GroupCreate(GroupBase):
    student_ids: Optional[List[int]] = []
    teacher_id: Optional[int] = None

class StudentCreate(StudentBase):
    group_ids: Optional[List[int]] = []

# =========== UPDATE ===========
class TeacherUpdate(BaseModel):
    login: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    is_ovz: Optional[bool] = None
    phone: Optional[str] = None
    group_ids: Optional[List[int]] = None
    model_config = ConfigDict(from_attributes=True)

class GroupUpdate(BaseModel):
    group_number: Optional[int] = None
    student_ids: Optional[List[int]] = None
    teacher_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    group_ids: Optional[List[int]] = None
    model_config = ConfigDict(from_attributes=True)

# =========== OUT ===========
class TeacherOut(TeacherSimple):
    groups: List[GroupSimple] = []

class GroupOut(GroupSimple):
    students: List[StudentSimple] = []
    teacher: Optional[TeacherSimple] = None

class StudentOut(StudentSimple):
    groups: List[GroupSimple] = []















