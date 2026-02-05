import models
import schemas
import crud_teacher
import crud_group
import crud_students
import crud_courses
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

# ============ Курсы ============
@app.get("/api/courses", response_model=list[schemas.CourseOut])
def read_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_courses.get_courses(db, skip, limit)

@app.get("/api/courses/{course_id}", response_model=schemas.CourseOut)
def read_course(course_id: int, db: Session = Depends(get_db)):
    db_course = crud_courses.get_course_by_id(db, course_id)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course

@app.post("/api/courses", response_model=schemas.CourseOut)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    return crud_courses.create_course(db, course)

@app.patch("/api/courses/{course_id}", response_model=schemas.CourseOut)
def update_course(course_id: int, course_data: schemas.CourseUpdate, db: Session = Depends(get_db)):
    db_course = crud_courses.update_course(db, course_id, course_data)
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db_course

@app.delete("/api/courses/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    success = crud_courses.delete_course(db, course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course not found")
    return None

# ============ Модули курсов ============
@app.get("/api/course-modules", response_model=list[schemas.CourseModuleSimple])
def read_course_modules(
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    db: Session = Depends(get_db),
):
    return crud_courses.get_course_modules(db, skip, limit, course_id)

@app.get("/api/course-modules/{module_id}", response_model=schemas.CourseModuleSimple)
def read_course_module(module_id: int, db: Session = Depends(get_db)):
    db_module = crud_courses.get_course_module_by_id(db, module_id)
    if not db_module:
        raise HTTPException(status_code=404, detail="Course module not found")
    return db_module

@app.post("/api/course-modules", response_model=schemas.CourseModuleSimple)
def create_course_module(module: schemas.CourseModuleCreate, db: Session = Depends(get_db)):
    return crud_courses.create_course_module(db, module)

@app.patch("/api/course-modules/{module_id}", response_model=schemas.CourseModuleSimple)
def update_course_module(
    module_id: int, module_data: schemas.CourseModuleUpdate, db: Session = Depends(get_db)
):
    db_module = crud_courses.update_course_module(db, module_id, module_data)
    if not db_module:
        raise HTTPException(status_code=404, detail="Course module not found")
    return db_module

@app.delete("/api/course-modules/{module_id}", status_code=204)
def delete_course_module(module_id: int, db: Session = Depends(get_db)):
    success = crud_courses.delete_course_module(db, module_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course module not found")
    return None

# ============ Уроки ============
@app.get("/api/course-lessons", response_model=list[schemas.CourseLessonSimple])
def read_course_lessons(
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    module_id: int | None = None,
    db: Session = Depends(get_db),
):
    return crud_courses.get_course_lessons(db, skip, limit, course_id, module_id)

@app.get("/api/course-lessons/{lesson_id}", response_model=schemas.CourseLessonSimple)
def read_course_lesson(lesson_id: int, db: Session = Depends(get_db)):
    db_lesson = crud_courses.get_course_lesson_by_id(db, lesson_id)
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    return db_lesson

@app.post("/api/course-lessons", response_model=schemas.CourseLessonSimple)
def create_course_lesson(lesson: schemas.CourseLessonCreate, db: Session = Depends(get_db)):
    return crud_courses.create_course_lesson(db, lesson)

@app.patch("/api/course-lessons/{lesson_id}", response_model=schemas.CourseLessonSimple)
def update_course_lesson(
    lesson_id: int, lesson_data: schemas.CourseLessonUpdate, db: Session = Depends(get_db)
):
    db_lesson = crud_courses.update_course_lesson(db, lesson_id, lesson_data)
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    return db_lesson

@app.delete("/api/course-lessons/{lesson_id}", status_code=204)
def delete_course_lesson(lesson_id: int, db: Session = Depends(get_db)):
    success = crud_courses.delete_course_lesson(db, lesson_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    return None

# ============ Материалы ============
@app.get("/api/course-materials", response_model=list[schemas.CourseMaterialSimple])
def read_course_materials(
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    lesson_id: int | None = None,
    db: Session = Depends(get_db),
):
    return crud_courses.get_course_materials(db, skip, limit, course_id, lesson_id)

@app.get("/api/course-materials/{material_id}", response_model=schemas.CourseMaterialSimple)
def read_course_material(material_id: int, db: Session = Depends(get_db)):
    db_material = crud_courses.get_course_material_by_id(db, material_id)
    if not db_material:
        raise HTTPException(status_code=404, detail="Course material not found")
    return db_material

@app.post("/api/course-materials", response_model=schemas.CourseMaterialSimple)
def create_course_material(material: schemas.CourseMaterialCreate, db: Session = Depends(get_db)):
    return crud_courses.create_course_material(db, material)

@app.patch("/api/course-materials/{material_id}", response_model=schemas.CourseMaterialSimple)
def update_course_material(
    material_id: int, material_data: schemas.CourseMaterialUpdate, db: Session = Depends(get_db)
):
    db_material = crud_courses.update_course_material(db, material_id, material_data)
    if not db_material:
        raise HTTPException(status_code=404, detail="Course material not found")
    return db_material

@app.delete("/api/course-materials/{material_id}", status_code=204)
def delete_course_material(material_id: int, db: Session = Depends(get_db)):
    success = crud_courses.delete_course_material(db, material_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course material not found")
    return None
