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

class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# =========== SIMPLE ===========
class TeacherSimple(TeacherBase):
    id: int

class GroupSimple(GroupBase):
    id: int

class StudentSimple(StudentBase):
    id: int

class CourseSimple(CourseBase):
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

class CourseCreate(CourseBase):
    pass

class CourseModuleBase(BaseModel):
    title: str
    module_number: int
    course_id: int
    model_config = ConfigDict(from_attributes=True)

class CourseLessonBase(BaseModel):
    title: str
    lesson_number: int
    description: Optional[str] = None
    course_id: int
    module_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class CourseMaterialBase(BaseModel):
    homework_file: Optional[str] = None
    homework_text: Optional[str] = None
    course_id: int
    lesson_id: int
    model_config = ConfigDict(from_attributes=True)

class CourseModuleCreate(CourseModuleBase):
    pass

class CourseLessonCreate(CourseLessonBase):
    pass

class CourseMaterialCreate(CourseMaterialBase):
    pass

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

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CourseModuleUpdate(BaseModel):
    title: Optional[str] = None
    module_number: Optional[int] = None
    course_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class CourseLessonUpdate(BaseModel):
    title: Optional[str] = None
    lesson_number: Optional[int] = None
    description: Optional[str] = None
    course_id: Optional[int] = None
    module_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class CourseMaterialUpdate(BaseModel):
    homework_file: Optional[str] = None
    homework_text: Optional[str] = None
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

# =========== OUT ===========
class TeacherOut(TeacherSimple):
    groups: List[GroupSimple] = []

class GroupOut(GroupSimple):
    students: List[StudentSimple] = []
    teacher: Optional[TeacherSimple] = None

class StudentOut(StudentSimple):
    groups: List[GroupSimple] = []

class CourseModuleSimple(CourseModuleBase):
    id: int

class CourseLessonSimple(CourseLessonBase):
    id: int

class CourseMaterialSimple(CourseMaterialBase):
    id: int

class CourseMaterialWithUrl(CourseMaterialSimple):
    url: Optional[str] = None

class LessonMaterialSimple(BaseModel):
    id: int
    name: Optional[str] = None
    size: Optional[int] = None
    lastModified: Optional[int] = None
    url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CourseLessonWithMaterials(CourseLessonSimple):
    materials: List[LessonMaterialSimple] = []

class CourseOut(CourseSimple):
    modules: List[CourseModuleSimple] = []
    lessons: List[CourseLessonSimple] = []










