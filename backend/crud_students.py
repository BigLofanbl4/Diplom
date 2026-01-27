from sqlalchemy.orm import Session
import models, schemas


def get_student_by_id(db: Session, student_id: int):
  return db.query(models.Student).filter(models.Student.id == student_id).first()

def get_students(db: Session, skip: int = 0, limit: int = 100):
  return db.query(models.Student).offset(skip).limit(limit).all()

def create_student(db: Session, student: schemas.StudentCreate):
  db_student = models.Student(
    first_name=student.first_name,
    last_name=student.last_name,
    phone=student.phone
  )
  if student.group_ids:
    db_groups = db.query(models.Group).filter(
      models.Group.id.in_(student.group_ids)
    ).all()

    db_student.groups = db_groups
  
  db.add(db_student)
  db.commit()
  db.refresh(db_student)
  return db_student

def update_student(db: Session, student_id: int, student_data: schemas.StudentUpdate):
  db_student = get_student_by_id(db, student_id)
  if not db_student:
    return None
  update_data = student_data.model_dump(exclude_unset=True)
  
  for key, value in update_data.items():
    if key == "group_ids": continue
    setattr(db_student, key, value)
  
  if "group_ids" in update_data:
    ids = update_data["group_ids"]
    if ids:
      db_groups = db.query(models.Group).filter(
        models.Group.id.in_(ids)
      ).all()

      db_student.groups = db_groups
    else:
      db_student.groups = []
  
  db.commit()
  db.refresh(db_student)
  return db_student

def delete_student(db: Session, student_id: int):
  db_student = get_student_by_id(db, student_id)
  if db_student:
    db.delete(db_student)
    db.commit()
    return True
  return False