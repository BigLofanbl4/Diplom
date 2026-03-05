import { db } from "../db.js";

export function serializeModule(moduleRecord) {
  return {
    id: moduleRecord.id,
    title: moduleRecord.title,
    module_number: moduleRecord.module_number,
    course_id: moduleRecord.course_id,
  };
}

export function serializeLesson(lessonRecord) {
  const materials = db.materials
    .filter((materialRecord) => (
      materialRecord.course_id === lessonRecord.course_id &&
      materialRecord.lesson_id === lessonRecord.id
    ))
    .map((materialRecord) => ({
      id: materialRecord.id,
      name: materialRecord.name,
      size: materialRecord.size,
      url: materialRecord.url,
    }));

  const test = db.tests.find((testRecord) => (
    testRecord.course_id === lessonRecord.course_id &&
    testRecord.lesson_id === lessonRecord.id
  ));

  return {
    id: lessonRecord.id,
    title: lessonRecord.title,
    lesson_number: lessonRecord.lesson_number,
    description: lessonRecord.description,
    homework_text: lessonRecord.homework_text,
    course_id: lessonRecord.course_id,
    module_id: lessonRecord.module_id,
    test_id: test?.id ?? null,
    materials,
  };
}

export function serializeCourse(courseRecord) {
  return {
    id: courseRecord.id,
    title: courseRecord.title,
    description: courseRecord.description,
  };
}

export function serializeCourseDetails(courseRecord) {
  const courseModules = db.modules
    .filter((moduleRecord) => moduleRecord.course_id === courseRecord.id)
    .map((moduleRecord) => serializeModule(moduleRecord));

  const courseLessons = db.lessons
    .filter((lessonRecord) => lessonRecord.course_id === courseRecord.id)
    .map((lessonRecord) => serializeLesson(lessonRecord));

  return {
    ...serializeCourse(courseRecord),
    modules: courseModules,
    lessons: courseLessons,
  };
}
