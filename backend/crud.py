from sqlalchemy.orm import Session
import models, schemas

def get_teacher(db: Session, teacher_id: int):
    return db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()

def get_teacher_by_login(db: Session, login: str):
    return db.query(models.Teacher).filter(models.Teacher.login == login).first()

def get_teacher_by_id(db: Session, teacher_id: int):
    return db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()

def get_teachers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Teacher).offset(skip).limit(limit).all()

def create_teacher(db: Session, teacher: schemas.TeacherCreate):
    db_teacher = models.Teacher(
        login=teacher.login,
        password=teacher.password, # В будущем здесь будет хеш
        first_name=teacher.first_name,
        last_name=teacher.last_name,
        phone=teacher.phone,
        age=teacher.age,
        is_ovz=teacher.is_ovz,
        organization_id=teacher.organization_id
    )
    db.add(db_teacher)          # Добавляем в сессию
    db.commit()                 # Сохраняем в базу
    db.refresh(db_teacher)      # Подгружаем ID, созданный базой
    return db_teacher
