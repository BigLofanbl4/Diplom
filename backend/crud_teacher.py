from sqlalchemy.orm import Session
import models, schemas


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
    if teacher.group_ids:
        groups = db.query(models.Group).filter(models.Group.id.in_(teacher.group_ids)).all()
        db_teacher.groups = groups

    db.add(db_teacher)          # Добавляем в сессию
    db.commit()                 # Сохраняем в базу
    db.refresh(db_teacher)      # Подгружаем ID, созданный базой
    return db_teacher

def update_teacher(db: Session, teacher_id: int, teacher_data: schemas.TeacherUpdate):
    db_teacher = get_teacher_by_id(db, teacher_id)
    if not db_teacher:
        return None
    update_data = teacher_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if key == "group_ids": continue
        setattr(db_teacher, key, value)

    if "group_ids" in update_data:
        ids = update_data["group_ids"]
        if ids:
            groups = db.query(models.Group).filter(models.Group.id.in_(ids)).all()
            db_teacher.groups = groups
        else:
            db_teacher.groups = []

    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def delete_teacher(db: Session, teacher_id: int):
    db_teacher = get_teacher_by_id(db, teacher_id)
    if db_teacher:
        db.delete(db_teacher)
        db.commit()
        return True
    return False