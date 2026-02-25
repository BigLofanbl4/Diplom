import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField } from "../utils/normalize.js";

const COURSE_UPDATABLE_FIELDS = new Set([
  "title",
  "description",
]);


export function getCourses(_req, res) {
  return sendJson(res, 200, db.courses.map(courseRecord => serializeCourse(courseRecord)));
}

export function getCourseById(_req, res, params) {
  const courseId = Number(params.id);
  const courseRecord = db.courses.find(courseRecord => courseRecord.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  return sendJson(res, 200, serializeCourseDetails(courseRecord));
}

export async function createCourse(req, res) {
  const courseId = nextId("courses");
  const payload = await parseBody(req);

  if (!payload.title) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const courseRecord = {
    id: courseId,
    title: payload.title,
    description: normalizeNullableField(payload.description),
  };

  db.courses.push(courseRecord);

  return sendJson(res, 201, serializeCourse(courseRecord));
}

export async function updateCourse(req, res, params) {
  const courseId = Number(params.id);
  const courseRecord = db.courses.find(courseRecord => courseRecord.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const payload = await parseBody(req);
  for (const key in payload) {
    if (!COURSE_UPDATABLE_FIELDS.has(key)) continue;
    if (key === "description") {
      courseRecord[key] = normalizeNullableField(payload[key]);
      continue;
    }
    courseRecord[key] = payload[key];
  }

  return sendJson(res, 200, serializeCourse(courseRecord));
}

export function deleteCourse(_req, res, params) {
  const courseId = Number(params.id);
  const coursesBeforeDelete = db.courses.length;
  db.courses = db.courses.filter(courseRecord => courseRecord.id !== courseId);
  if (db.courses.length === coursesBeforeDelete) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  db.groups.forEach(groupRecord => {
    if (groupRecord.course_id !== courseId) return;
    groupRecord.course_id = null;
  });
  db.modules = db.modules.filter(moduleRecord => moduleRecord.course_id !== courseId);

  const deletedLessonIds = [];
  db.lessons = db.lessons.filter(lessonRecord => {
    if (lessonRecord.course_id === courseId) {
      deletedLessonIds.push(lessonRecord.id);
      return false;
    }
    return true;
  });

  db.materials = db.materials.filter(materialRecord => !deletedLessonIds.includes(materialRecord.lesson_id));

  return sendNoContent(res, 204);
}

function serializeCourse(courseRecord) {
  return {
    id: courseRecord.id,
    title: courseRecord.title,
    description: courseRecord.description,
  }
}

function serializeCourseDetails(courseRecord) {
  const courseModules = db.modules.filter(moduleRecord => moduleRecord.course_id === courseRecord.id);
  const courseLessons = db.lessons.filter(lessonRecord => lessonRecord.course_id === courseRecord.id);
  return {
    id: courseRecord.id,
    title: courseRecord.title,
    description: courseRecord.description,
    modules: courseModules,
    lessons: courseLessons,
  }
}
