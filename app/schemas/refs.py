from pydantic import BaseModel, ConfigDict


class OrganizationRef(BaseModel):
    id: int
    legal_address: str
    model_config = ConfigDict(from_attributes=True)


class AdminRef(BaseModel):
    id: int
    login: str
    model_config = ConfigDict(from_attributes=True)


class TeacherRef(BaseModel):
    id: int
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


class StudentRef(BaseModel):
    id: int
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


class CourseRef(BaseModel):
    id: int
    title: str
    model_config = ConfigDict(from_attributes=True)


class GroupRef(BaseModel):
    id: int
    group_number: str
    model_config = ConfigDict(from_attributes=True)
