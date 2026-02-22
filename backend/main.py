import models
import schemas
import crud_teacher
import crud_group
import crud_students
import crud_courses
from fastapi import FastAPI, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from database import engine, get_db
from typing import Optional

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Teacher App API")

def _material_url(material_id: int) -> str:
    return f"/api/course-materials/{material_id}"

def _serialize_course_material(db_material: models.CourseMaterial):
    return {
        "id": db_material.id,
        "homework_file": db_material.homework_file,
        "homework_text": db_material.homework_text,
        "course_id": db_material.course_id,
        "lesson_id": db_material.lesson_id,
        "url": _material_url(db_material.id),
    }

def _serialize_lesson_with_materials(db_lesson: models.CourseLesson):
    return {
        "id": db_lesson.id,
        "title": db_lesson.title,
        "lesson_number": db_lesson.lesson_number,
        "description": db_lesson.description,
        "course_id": db_lesson.course_id,
        "module_id": db_lesson.module_id,
        "materials": [
            {
                "id": material.id,
                "name": material.homework_file,
                "size": None,
                "lastModified": None,
                "url": _material_url(material.id),
            }
            for material in db_lesson.materials
        ],
    }

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

@app.get("/api/course-lessons/{lesson_id}", response_model=schemas.CourseLessonWithMaterials)
def read_course_lesson(lesson_id: int, db: Session = Depends(get_db)):
    db_lesson = crud_courses.get_course_lesson_by_id(db, lesson_id)
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    return _serialize_lesson_with_materials(db_lesson)

@app.post("/api/course-lessons", response_model=schemas.CourseLessonWithMaterials)
def create_course_lesson(
    title: str = Form(...),
    lesson_number: int = Form(...),
    description: Optional[str] = Form(None),
    course_id: int = Form(...),
    module_id: Optional[int] = Form(None),
    materials: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(get_db),
):
    lesson = schemas.CourseLessonCreate(
        title=title,
        lesson_number=lesson_number,
        description=description,
        course_id=course_id,
        module_id=module_id,
    )
    db_lesson = crud_courses.create_course_lesson(db, lesson)

    for upload in (materials or []):
        if not upload or not upload.filename:
            continue
        material = schemas.CourseMaterialCreate(
            homework_file=upload.filename,
            homework_text=None,
            course_id=db_lesson.course_id,
            lesson_id=db_lesson.id,
        )
        crud_courses.create_course_material(db, material)

    db.refresh(db_lesson)
    return _serialize_lesson_with_materials(db_lesson)

@app.patch("/api/course-lessons/{lesson_id}", response_model=schemas.CourseLessonWithMaterials)
def update_course_lesson(
    lesson_id: int,
    title: Optional[str] = Form(None),
    lesson_number: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    course_id: Optional[int] = Form(None),
    module_id: Optional[int] = Form(None),
    removed_material_ids: Optional[list[int]] = Form(None),
    materials: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(get_db),
):
    update_payload = {}
    if title is not None:
        update_payload["title"] = title
    if lesson_number is not None:
        update_payload["lesson_number"] = lesson_number
    if description is not None:
        update_payload["description"] = description
    if course_id is not None:
        update_payload["course_id"] = course_id
    if module_id is not None:
        update_payload["module_id"] = module_id

    lesson_data = schemas.CourseLessonUpdate(**update_payload)
    db_lesson = crud_courses.update_course_lesson(db, lesson_id, lesson_data)
    if not db_lesson:
        raise HTTPException(status_code=404, detail="Course lesson not found")

    for material_id in (removed_material_ids or []):
        db_material = crud_courses.get_course_material_by_id(db, material_id)
        if not db_material:
            continue
        if db_material.lesson_id != db_lesson.id:
            continue
        crud_courses.delete_course_material(db, material_id)

    for upload in (materials or []):
        if not upload or not upload.filename:
            continue
        material = schemas.CourseMaterialCreate(
            homework_file=upload.filename,
            homework_text=None,
            course_id=db_lesson.course_id,
            lesson_id=db_lesson.id,
        )
        crud_courses.create_course_material(db, material)

    db.refresh(db_lesson)
    return _serialize_lesson_with_materials(db_lesson)

@app.delete("/api/course-lessons/{lesson_id}", status_code=204)
def delete_course_lesson(lesson_id: int, db: Session = Depends(get_db)):
    success = crud_courses.delete_course_lesson(db, lesson_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course lesson not found")
    return None

# ============ Материалы ============
@app.get("/api/course-materials", response_model=list[schemas.CourseMaterialWithUrl])
def read_course_materials(
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    lesson_id: int | None = None,
    db: Session = Depends(get_db),
):
    db_materials = crud_courses.get_course_materials(db, skip, limit, course_id, lesson_id)
    return [_serialize_course_material(material) for material in db_materials]

@app.get("/api/course-materials/{material_id}", response_model=schemas.CourseMaterialWithUrl)
def read_course_material(material_id: int, db: Session = Depends(get_db)):
    db_material = crud_courses.get_course_material_by_id(db, material_id)
    if not db_material:
        raise HTTPException(status_code=404, detail="Course material not found")
    return _serialize_course_material(db_material)

@app.post("/api/course-materials", response_model=schemas.CourseMaterialWithUrl)
def create_course_material(material: schemas.CourseMaterialCreate, db: Session = Depends(get_db)):
    db_material = crud_courses.create_course_material(db, material)
    return _serialize_course_material(db_material)

@app.patch("/api/course-materials/{material_id}", response_model=schemas.CourseMaterialWithUrl)
def update_course_material(
    material_id: int, material_data: schemas.CourseMaterialUpdate, db: Session = Depends(get_db)
):
    db_material = crud_courses.update_course_material(db, material_id, material_data)
    if not db_material:
        raise HTTPException(status_code=404, detail="Course material not found")
    return _serialize_course_material(db_material)

@app.delete("/api/course-materials/{material_id}", status_code=204)
def delete_course_material(material_id: int, db: Session = Depends(get_db)):
    success = crud_courses.delete_course_material(db, material_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course material not found")
    return None
