from sqlalchemy import Column, Integer, String, Text, Boolean, Table, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from database import Base

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)

    login = Column(String, unique=True, index=True, nullable=False)

    password = Column(String, nullable=False)

    phone = Column(String, nullable=True)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)

    is_ovz = Column(Boolean, default=False)

    organization_id = Column(Integer, nullable=True)

    groups = relationship("Group", back_populates="teacher")

student_group = Table("student_group", Base.metadata,
    Column('student_id', Integer, ForeignKey('students.id'), primary_key=True),
    Column('group_id', Integer, ForeignKey('groups.id'), primary_key=True)
)

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    groups = relationship("Group", secondary=student_group, back_populates="students")

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    group_number = Column(Integer, unique=True, index=True, nullable=False)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=True)
    teacher_id = Column(Integer, ForeignKey('teachers.id'))
    teacher = relationship("Teacher", back_populates="groups")
    students = relationship("Student", secondary=student_group, back_populates="groups")
    course = relationship("Course", back_populates="groups")

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    modules: Mapped[list["CourseModule"]] = relationship(
        "CourseModule", back_populates="course", cascade="all, delete-orphan"
    )
    lessons: Mapped[list["CourseLesson"]] = relationship(
        "CourseLesson", back_populates="course", cascade="all, delete-orphan"
    )
    materials: Mapped[list["CourseMaterial"]] = relationship(
        "CourseMaterial", back_populates="course", cascade="all, delete-orphan"
    )
    groups: Mapped[list["Group"]] = relationship("Group", back_populates="course")


class CourseModule(Base):
    __tablename__ = "course_modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    module_number: Mapped[int] = mapped_column(Integer, nullable=False)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    lessons: Mapped[list["CourseLesson"]] = relationship(
        "CourseLesson", back_populates="module", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("course_id", "module_number", name="uq_course_module_number"),)


class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    lesson_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    module_id: Mapped[int | None] = mapped_column(
        ForeignKey("course_modules.id", ondelete="SET NULL"), nullable=True
    )

    course: Mapped["Course"] = relationship("Course", back_populates="lessons")
    module: Mapped["CourseModule"] = relationship("CourseModule", back_populates="lessons")
    materials: Mapped[list["CourseMaterial"]] = relationship(
        "CourseMaterial", back_populates="lesson", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("course_id", "lesson_number", name="uq_course_lesson_number"),)


class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    homework_file: Mapped[str | None] = mapped_column(String(255), nullable=True)
    homework_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("course_lessons.id", ondelete="CASCADE"), nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="materials")
    lesson: Mapped["CourseLesson"] = relationship("CourseLesson", back_populates="materials")
