import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField } from "../utils/normalize.js";
import {
  serializeCourse,
  serializeCourseDetails,
} from "../utils/serializers.js";
import { requireAuth } from "./auth.js";

const COURSE_UPDATABLE_FIELDS = new Set([
  "title",
  "description",
]);


export function getCourses(req, res) {
  if (!requireAuth(req, res)) return;
  return sendJson(res, 200, {
    data: db.courses
      .filter((courseRecord) => courseRecord.kind !== "instance")
      .map(courseRecord => serializeCourse(courseRecord))
  });
}

export function getCourseById(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.id);
  const courseRecord = db.courses.find(courseRecord => courseRecord.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  return sendJson(res, 200, serializeCourseDetails(courseRecord));
}

export async function createCourse(req, res) {
  if (!requireAuth(req, res)) return;
  const courseId = nextId("courses");
  const payload = await parseBody(req);

  if (!payload.title) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const courseRecord = {
    id: courseId,
    title: payload.title,
    description: normalizeNullableField(payload.description),
    kind: "template",
    template_course_id: null,
    group_id: null,
    teacher_id: null,
    max_modules_count: 0,
  };

  db.courses.push(courseRecord);

  return sendJson(res, 201, serializeCourse(courseRecord));
}

export async function updateCourse(req, res, params) {
  if (!requireAuth(req, res)) return;
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

export function deleteCourse(req, res, params) {
  if (!requireAuth(req, res)) return;
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

  const removedCourseIds = [courseId];
  const relatedInstances = db.courses
    .filter((courseRecord) => courseRecord.kind === "instance" && courseRecord.template_course_id === courseId)
    .map((courseRecord) => courseRecord.id);
  removedCourseIds.push(...relatedInstances);

  db.courses = db.courses.filter((courseRecord) => !removedCourseIds.includes(courseRecord.id));
  db.modules = db.modules.filter(moduleRecord => !removedCourseIds.includes(moduleRecord.course_id));

  const deletedLessonIds = [];
  db.lessons = db.lessons.filter(lessonRecord => {
    if (removedCourseIds.includes(lessonRecord.course_id)) {
      deletedLessonIds.push(lessonRecord.id);
      return false;
    }
    return true;
  });

  db.materials = db.materials.filter(materialRecord => !deletedLessonIds.includes(materialRecord.lesson_id));
  const deletedTestIds = db.tests
    .filter((testRecord) => removedCourseIds.includes(testRecord.course_id) || deletedLessonIds.includes(testRecord.lesson_id))
    .map((testRecord) => testRecord.id);
  db.tests = db.tests.filter((testRecord) => !deletedTestIds.includes(testRecord.id));
  db.questions = db.questions.filter((questionRecord) => !deletedTestIds.includes(questionRecord.test_id));

  return sendNoContent(res, 204);
}
