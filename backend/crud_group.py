from sqlalchemy.orm import Session
from fastapi import HTTPException
import models, schemas


def get_group_by_id(db: Session, group_id: int):
  return db.query(models.Group).filter(models.Group.id == group_id).first()

def get_groups(db: Session, skip: int = 0, limit: int = 100):
  return db.query(models.Group).offset(skip).limit(limit).all()

def get_group_by_number(db: Session, group_number: int):
  return db.query(models.Group).filter(models.Group.group_number == group_number).first()

def create_group(db: Session, group: schemas.GroupCreate):
  db_group = models.Group(
    group_number=group.group_number,
    teacher_id=group.teacher_id
  )
  if group.student_ids:
    students = db.query(models.Student).filter(
      models.Student.id.in_(group.student_ids)
    ).all()
    db_group.students = students

  db.add(db_group)
  db.commit()
  db.refresh(db_group)
  return db_group

def update_group(db: Session, group_id: int, group_data: schemas.GroupUpdate):
  db_group = get_group_by_id(db, group_id)
  if not db_group:
    return None
  update_data = group_data.model_dump(exclude_unset=True)

  for key, value in update_data.items():
    if key == "student_ids": continue
    setattr(db_group, key, value)

  if "student_ids" in update_data:
    ids = update_data["student_ids"]
    if ids:
      students = db.query(models.Student).filter(
        models.Student.id.in_ == ids
      ).all()
      db_group.students = students
    else:
      db_group.students = []
  
  db.commit()
  db.refresh(db_group)
  return db_group

def delete_group(db: Session, group_id: int):
  db_group = get_group_by_id(db, group_id)
  if db_group:
    db.delete(db_group)
    db.commit()
    return True
  return False