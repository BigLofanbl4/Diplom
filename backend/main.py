import models
import schemas
import crud_teacher
import crud_group
import crud_students
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Teacher App API")

# ============ Учителя ============
@app.post("/api/teachers", response_model=schemas.TeacherOut)
def create_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    db_teacher = crud_teacher.get_teacher_by_login(db, login=teacher.login)
    if db_teacher:
        raise HTTPException(status_code=400, detail="Login already registered")
    
    return crud_teacher.create_teacher(db=db, teacher=teacher)

@app.get("/api/teachers", response_model=list[schemas.TeacherOut])
def read_teachers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    teachers = crud_teacher.get_teachers(db, skip=skip, limit=limit)
    return teachers

@app.get("/api/teachers/{teacher_id}", response_model=schemas.TeacherOut)
def read_teacher(teacher_id: int, db: Session = Depends(get_db)):
    db_teacher = crud_teacher.get_teacher_by_id(db, teacher_id=teacher_id)
    if db_teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return db_teacher

@app.patch("/api/teachers/{teacher_id}", response_model=schemas.TeacherOut)
def update_teacher(teacher_id: int, teacher_data: schemas.TeacherUpdate, db: Session = Depends(get_db)):
    db_teacher = crud_teacher.update_teacher(db, teacher_id, teacher_data)
    if not db_teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return db_teacher

@app.delete("/api/teachers/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    success = crud_teacher.delete_teacher(db, teacher_id)
    if not success:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return None

# ============ Группы ============
@app.get("/api/groups", response_model=list[schemas.GroupOut])
def read_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    db_groups = crud_group.get_groups(db, skip, limit)
    return db_groups

@app.get("/api/groups/{group_id}", response_model=schemas.GroupOut)
def read_group(group_id: int, db: Session = Depends(get_db)):
    db_group = crud_group.get_group_by_id(db, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_group

@app.post("/api/groups", response_model=schemas.GroupOut)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    db_group = crud_group.get_group_by_number(db, group.group_number)
    if db_group:
        raise HTTPException(status_code=400, detail="Group already exists")
    return crud_group.create_group(db, group)

@app.patch("/api/groups/{group_id}", response_model=schemas.GroupOut)
def update_group(group_id: int, group_data: schemas.GroupUpdate, db: Session = Depends(get_db)):
    db_group = crud_group.update_group(db, group_id, group_data)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_group

@app.delete("/api/groups/{group_id}", status_code=204)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    success = crud_group.delete_group(db, group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Group not found")
    return None
    
# ============ Студенты ============
@app.get("/api/students", response_model=list[schemas.StudentOut])
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_students.get_students(db, skip, limit)

@app.get("/api/students/{student_id}", response_model=schemas.StudentOut)
def read_student(student_id: int, db: Session = Depends(get_db)):
    db_student = crud_students.get_student_by_id(db, student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@app.post("/api/students", response_model=schemas.StudentOut)
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    return crud_students.create_student(db, student)

@app.patch("/api/students/{student_id}", response_model=schemas.StudentOut)
def update_student(student_id: int, student_data: schemas.StudentUpdate, db: Session = Depends(get_db)):
    db_student = crud_students.update_student(db, student_id, student_data)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@app.delete("/api/students/{student_id}", status_code=204)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    success = crud_students.delete_student(db, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    return None