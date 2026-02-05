from sqlalchemy.orm import Session
import models, schemas

# ===== Courses =====

def get_course_by_id(db: Session, course_id: int):
    return db.query(models.Course).filter(models.Course.id == course_id).first()


def get_courses(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Course).offset(skip).limit(limit).all()


def create_course(db: Session, course: schemas.CourseCreate):
    db_course = models.Course(
        title=course.title,
        description=course.description,
    )
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


def update_course(db: Session, course_id: int, course_data: schemas.CourseUpdate):
    db_course = get_course_by_id(db, course_id)
    if not db_course:
        return None
    update_data = course_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)
    db.commit()
    db.refresh(db_course)
    return db_course


def delete_course(db: Session, course_id: int):
    db_course = get_course_by_id(db, course_id)
    if db_course:
        db.delete(db_course)
        db.commit()
        return True
    return False

# ===== Modules =====

def get_course_module_by_id(db: Session, module_id: int):
    return db.query(models.CourseModule).filter(models.CourseModule.id == module_id).first()


def get_course_modules(db: Session, skip: int = 0, limit: int = 100, course_id: int | None = None):
    query = db.query(models.CourseModule)
    if course_id is not None:
        query = query.filter(models.CourseModule.course_id == course_id)
    return query.offset(skip).limit(limit).all()


def create_course_module(db: Session, module: schemas.CourseModuleCreate):
    db_module = models.CourseModule(
        title=module.title,
        module_number=module.module_number,
        course_id=module.course_id,
    )
    db.add(db_module)
    db.commit()
    db.refresh(db_module)
    return db_module


def update_course_module(db: Session, module_id: int, module_data: schemas.CourseModuleUpdate):
    db_module = get_course_module_by_id(db, module_id)
    if not db_module:
        return None
    update_data = module_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_module, key, value)
    db.commit()
    db.refresh(db_module)
    return db_module


def delete_course_module(db: Session, module_id: int):
    db_module = get_course_module_by_id(db, module_id)
    if db_module:
        db.delete(db_module)
        db.commit()
        return True
    return False

# ===== Lessons =====

def get_course_lesson_by_id(db: Session, lesson_id: int):
    return db.query(models.CourseLesson).filter(models.CourseLesson.id == lesson_id).first()


def get_course_lessons(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    module_id: int | None = None,
):
    query = db.query(models.CourseLesson)
    if course_id is not None:
        query = query.filter(models.CourseLesson.course_id == course_id)
    if module_id is not None:
        query = query.filter(models.CourseLesson.module_id == module_id)
    return query.offset(skip).limit(limit).all()


def create_course_lesson(db: Session, lesson: schemas.CourseLessonCreate):
    db_lesson = models.CourseLesson(
        title=lesson.title,
        lesson_number=lesson.lesson_number,
        description=lesson.description,
        course_id=lesson.course_id,
        module_id=lesson.module_id,
    )
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson


def update_course_lesson(db: Session, lesson_id: int, lesson_data: schemas.CourseLessonUpdate):
    db_lesson = get_course_lesson_by_id(db, lesson_id)
    if not db_lesson:
        return None
    update_data = lesson_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lesson, key, value)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson


def delete_course_lesson(db: Session, lesson_id: int):
    db_lesson = get_course_lesson_by_id(db, lesson_id)
    if db_lesson:
        db.delete(db_lesson)
        db.commit()
        return True
    return False

# ===== Materials =====

def get_course_material_by_id(db: Session, material_id: int):
    return db.query(models.CourseMaterial).filter(models.CourseMaterial.id == material_id).first()


def get_course_materials(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    course_id: int | None = None,
    lesson_id: int | None = None,
):
    query = db.query(models.CourseMaterial)
    if course_id is not None:
        query = query.filter(models.CourseMaterial.course_id == course_id)
    if lesson_id is not None:
        query = query.filter(models.CourseMaterial.lesson_id == lesson_id)
    return query.offset(skip).limit(limit).all()


def create_course_material(db: Session, material: schemas.CourseMaterialCreate):
    db_material = models.CourseMaterial(
        homework_file=material.homework_file,
        homework_text=material.homework_text,
        course_id=material.course_id,
        lesson_id=material.lesson_id,
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material


def update_course_material(db: Session, material_id: int, material_data: schemas.CourseMaterialUpdate):
    db_material = get_course_material_by_id(db, material_id)
    if not db_material:
        return None
    update_data = material_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_material, key, value)
    db.commit()
    db.refresh(db_material)
    return db_material


def delete_course_material(db: Session, material_id: int):
    db_material = get_course_material_by_id(db, material_id)
    if db_material:
        db.delete(db_material)
        db.commit()
        return True
    return False
