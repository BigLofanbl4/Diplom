import { db, nextId } from "../db.js";
import { parseMultipartBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField, normalizeNullableId } from "../utils/normalize.js";
import { serializeLesson } from "../utils/serializers.js";
import {
  cloneLessonMaterials,
  cloneLessonTest,
  findTemplateLesson,
  isInstanceCourse,
} from "../utils/courseTemplates.js";
import { requireAuth } from "./auth.js";

const LESSON_UPDATABLE_FIELDS = new Set([
  "title",
  "lesson_number",
  "description",
  "homework_text",
  "module_id",
]);


export function getLessons(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const courseRecord = db.courses.find(course => course.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const lessons = db.lessons.filter(lessonRecord => lessonRecord.course_id === courseId);
  return sendJson(res, 200, lessons.map(lessonRecord => serializeLesson(lessonRecord)));
}

export function getLessonById(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const lessonId = Number(params.lesson_id);
  const lessonRecord = db.lessons.find(
    lessonRecord => lessonRecord.id === lessonId && lessonRecord.course_id === courseId
  );
  if (!lessonRecord) {
    return sendJson(res, 404, { detail: "Lesson not found" });
  }

  return sendJson(res, 200, serializeLesson(lessonRecord));
}

export async function createLesson(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const courseRecord = db.courses.find(courseRecord => courseRecord.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const lessonId = nextId("lessons");
  const { fields, files } = await parseMultipartBody(req);
  const moduleId = normalizeNullableId(fields.module_id);
  const moduleRecord = db.modules.find(
    (moduleRecord) => moduleRecord.id === moduleId && moduleRecord.course_id === courseId
  );
  if (!moduleRecord) {
    return sendJson(res, 400, { detail: "Module not found in course" });
  }

  const lessonNumber = Number(fields.lesson_number);
  if (Number.isNaN(lessonNumber)) {
    return sendJson(res, 400, { detail: "Invalid lesson_number" });
  }

  const templateLesson = isInstanceCourse(courseRecord)
    ? findTemplateLesson(courseRecord, moduleRecord.module_number, lessonNumber)
    : null;

  if (!templateLesson && !fields.title) {
    return sendJson(res, 400, { detail: "Title is required for custom lesson" });
  }

  const lesson = {
    id: lessonId,
    title: normalizeNullableField(fields.title) ?? templateLesson?.title ?? null,
    lesson_number: lessonNumber,
    description: normalizeNullableField(fields.description) ?? templateLesson?.description ?? null,
    homework_text: normalizeNullableField(fields.homework_text) ?? templateLesson?.homework_text ?? null,
    module_id: moduleId,
    course_id: courseId,
  };

  if (templateLesson) {
    cloneLessonMaterials({
      fromLessonId: templateLesson.id,
      fromCourseId: templateLesson.course_id,
      toLessonId: lessonId,
      toCourseId: courseId,
    });
  }

  if (files.materials) {
    for (const material of files.materials) {
      const materialId = nextId("materials");
      const materialRecord = {
        id: materialId,
        name: material.name,
        size: material.size,
        url: `/material/${materialId}`,
        course_id: courseId,
        lesson_id: lessonId
      };
      db.materials.push(materialRecord);
    }
  }

  db.lessons.push(lesson);

  if (templateLesson) {
    cloneLessonTest({
      fromLessonId: templateLesson.id,
      fromCourseId: templateLesson.course_id,
      toLessonId: lessonId,
      toCourseId: courseId,
    });
  }

  return sendJson(res, 201, serializeLesson(lesson));
}

export async function updateLesson(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const lessonId = Number(params.lesson_id);
  const lessonRecord = db.lessons.find(
    lessonRecord => lessonRecord.id === lessonId && lessonRecord.course_id === courseId
  );
  if (!lessonRecord) {
    return sendJson(res, 404, { detail: "Lesson not found" });
  }
  const { fields, files } = await parseMultipartBody(req);
  for (const key in fields) {
    if (key === "removed_material_ids" || key === "materials" || key === "course_id") continue;
    if (!LESSON_UPDATABLE_FIELDS.has(key)) continue;
    if (key === "lesson_number") {
      const lessonNumber = Number(fields[key]);
      if (Number.isNaN(lessonNumber)) continue;
      lessonRecord[key] = lessonNumber;
      continue;
    }
    if (key === "module_id") {
      const nextModuleId = normalizeNullableId(fields[key]);
      const targetModule = db.modules.find(
        (moduleRecord) => moduleRecord.id === nextModuleId && moduleRecord.course_id === courseId
      );
      if (!targetModule) continue;
      lessonRecord[key] = nextModuleId;
      continue;
    }
    lessonRecord[key] = normalizeNullableField(fields[key]);
  }

  if (fields["removed_material_ids"] !== undefined ) {
    const rawRemovedMaterialIds = Array.isArray(fields["removed_material_ids"])
      ? fields["removed_material_ids"]
      : [fields["removed_material_ids"]]
    const normalizedRemovedMaterialIds = rawRemovedMaterialIds
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));
    db.materials = db.materials.filter(
      (materialRecord) => {
        if (materialRecord.lesson_id !== lessonId) return true;
        return !normalizedRemovedMaterialIds.includes(materialRecord.id);
      }
    );
  }

  if (files.materials) {
    for (const material of files.materials) {
      const materialId = nextId("materials");
      const materialRecord = {
        id: materialId,
        name: material.name,
        size: material.size,
        url: `/material/${materialId}`,
        course_id: courseId,
        lesson_id: lessonId
      };
      db.materials.push(materialRecord);
    }
  }

  return sendJson(res, 200, serializeLesson(lessonRecord));
}

export function deleteLesson(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const lessonId = Number(params.lesson_id);
  const lessonsBeforeDelete = db.lessons.length;

  db.lessons = db.lessons.filter(lessonRecord => lessonRecord.id !== lessonId);
  if (db.lessons.length === lessonsBeforeDelete) {
    return sendJson(res, 404, { detail: "Lesson not found" });
  }

  db.materials = db.materials.filter(
    materialRecord => materialRecord.lesson_id !== lessonId
  );
  const deletedTestIds = db.tests
    .filter((testRecord) => testRecord.lesson_id === lessonId && testRecord.course_id === courseId)
    .map((testRecord) => testRecord.id);
  db.tests = db.tests.filter((testRecord) => !deletedTestIds.includes(testRecord.id));
  db.questions = db.questions.filter((questionRecord) => !deletedTestIds.includes(questionRecord.test_id));

  return sendNoContent(res, 204);
}
