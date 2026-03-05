from sqlalchemy import Column, Integer, String, Boolean, Table, ForeignKey
from sqlalchemy.orm import relationship
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
    students = relationship("Student", secondary=student_group, back_populates="groups")

