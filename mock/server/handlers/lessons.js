import { db, nextId } from "../db.js";
import { parseMultipartBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField, normalizeNullableId } from "../utils/normalize.js";
import { serializeLesson } from "../utils/serializers.js";

const LESSON_UPDATABLE_FIELDS = new Set([
  "title",
  "lesson_number",
  "description",
  "homework_text",
  "module_id",
]);


export function getLessons(_req, res, params) {
  const courseId = Number(params.course_id);
  const courseRecord = db.courses.find(course => course.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const lessons = db.lessons.filter(lessonRecord => lessonRecord.course_id === courseId);
  return sendJson(res, 200, lessons.map(lessonRecord => serializeLesson(lessonRecord)));
}

export function getLessonById(_req, res, params) {
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
  const courseId = Number(params.course_id);
  const courseRecord = db.courses.find(courseRecord => courseRecord.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const lessonId = nextId("lessons");
  const { fields, files } = await parseMultipartBody(req);

  const lesson = {
    id: lessonId,
    title: fields.title,
    lesson_number: Number(fields.lesson_number),
    description: normalizeNullableField(fields.description),
    homework_text: normalizeNullableField(fields.homework_text),
    module_id: normalizeNullableId(fields.module_id),
    course_id: normalizeNullableId(courseId),
  };

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

  return sendJson(res, 201, serializeLesson(lesson));
}

export async function updateLesson(req, res, params) {
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
      lessonRecord[key] = normalizeNullableId(fields[key]);
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

export function deleteLesson(_req, res, params) {
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

  return sendNoContent(res, 204);
}
