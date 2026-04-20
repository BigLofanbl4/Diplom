import { db, nextId } from "../db.js";

export function isTemplateCourse(courseRecord) {
  return courseRecord?.kind !== "instance";
}

export function isInstanceCourse(courseRecord) {
  return courseRecord?.kind === "instance";
}

export function getTemplateCourse(courseRecord) {
  if (!courseRecord) return null;
  if (isTemplateCourse(courseRecord)) return courseRecord;
  return db.courses.find((course) => course.id === courseRecord.template_course_id) ?? null;
}

export function getTemplateModuleLimit(courseRecord) {
  const templateCourse = getTemplateCourse(courseRecord);
  if (!templateCourse) return 0;

  if (Number.isInteger(templateCourse.max_modules_count) && templateCourse.max_modules_count > 0) {
    return templateCourse.max_modules_count;
  }

  return db.modules
    .filter((moduleRecord) => moduleRecord.course_id === templateCourse.id)
    .reduce((max, moduleRecord) => Math.max(max, moduleRecord.module_number), 0);
}

export function findCourseInstanceByGroupId(groupId) {
  return db.courses.find((course) => course.kind === "instance" && course.group_id === groupId) ?? null;
}

export function ensureCourseInstance(groupRecord) {
  const existingInstance = findCourseInstanceByGroupId(groupRecord.id);
  if (existingInstance) return existingInstance;

  const templateCourse = db.courses.find((course) => course.id === groupRecord.course_id);
  if (!templateCourse) return null;

  const courseId = nextId("courses");
  const instanceCourse = {
    id: courseId,
    title: `${templateCourse.title} · Группа ${groupRecord.group_number}`,
    description: templateCourse.description,
    kind: "instance",
    template_course_id: templateCourse.id,
    group_id: groupRecord.id,
    teacher_id: groupRecord.teacher_id,
    max_modules_count: getTemplateModuleLimit(templateCourse),
  };

  db.courses.push(instanceCourse);
  return instanceCourse;
}

export function findTemplateModule(courseRecord, moduleNumber) {
  const normalizedModuleNumber = Number(moduleNumber);
  if (Number.isNaN(normalizedModuleNumber)) return null;

  const templateCourse = getTemplateCourse(courseRecord);
  if (!templateCourse) return null;

  return db.modules.find(
    (moduleRecord) => (
      moduleRecord.course_id === templateCourse.id &&
      moduleRecord.module_number === normalizedModuleNumber
    )
  ) ?? null;
}

export function findTemplateLesson(courseRecord, moduleNumber, lessonNumber) {
  const templateModule = findTemplateModule(courseRecord, moduleNumber);
  if (!templateModule) return null;

  return db.lessons.find(
    (lessonRecord) => (
      lessonRecord.course_id === templateModule.course_id &&
      lessonRecord.module_id === templateModule.id &&
      lessonRecord.lesson_number === Number(lessonNumber)
    )
  ) ?? null;
}

export function cloneLessonMaterials({ fromLessonId, fromCourseId, toLessonId, toCourseId }) {
  const templateMaterials = db.materials.filter(
    (materialRecord) => (
      materialRecord.lesson_id === fromLessonId &&
      materialRecord.course_id === fromCourseId
    )
  );

  templateMaterials.forEach((materialRecord) => {
    db.materials.push({
      id: nextId("materials"),
      name: materialRecord.name,
      size: materialRecord.size,
      url: materialRecord.url,
      course_id: toCourseId,
      lesson_id: toLessonId,
    });
  });
}

export function cloneLessonTest({ fromLessonId, fromCourseId, toLessonId, toCourseId }) {
  const sourceTest = db.tests.find(
    (testRecord) => (
      testRecord.lesson_id === fromLessonId &&
      testRecord.course_id === fromCourseId
    )
  );

  if (!sourceTest) return null;

  const clonedTestId = nextId("tests");
  db.tests.push({
    ...sourceTest,
    id: clonedTestId,
    lesson_id: toLessonId,
    course_id: toCourseId,
  });

  const sourceQuestions = db.questions.filter((questionRecord) => questionRecord.test_id === sourceTest.id);
  sourceQuestions.forEach((questionRecord) => {
    db.questions.push({
      ...questionRecord,
      id: nextId("questions"),
      test_id: clonedTestId,
    });
  });

  return clonedTestId;
}
