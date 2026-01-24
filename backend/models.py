from sqlalchemy import Column, Integer, String, Boolean
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
