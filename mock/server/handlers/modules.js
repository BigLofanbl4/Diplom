import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField } from "../utils/normalize.js";
import { serializeModule } from "../utils/serializers.js";
import { requireAuth } from "./auth.js";

const MODULE_UPDATABLE_FIELDS = new Set([
  "title",
  "module_number",
]);

export function getModules(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const courseRecord = db.courses.find((course) => course.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const modules = db.modules.filter((moduleRecord) => moduleRecord.course_id === courseId);
  return sendJson(res, 200, modules.map((moduleRecord) => serializeModule(moduleRecord)));
}

export function getModuleById(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const moduleId = Number(params.module_id);
  const moduleRecord = db.modules.find(
    (moduleItem) => moduleItem.id === moduleId && moduleItem.course_id === courseId
  );
  if (!moduleRecord) {
    return sendJson(res, 404, { detail: "Module not found" });
  }

  return sendJson(res, 200, serializeModule(moduleRecord));
}

export async function createModule(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const courseRecord = db.courses.find((course) => course.id === courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const moduleId = nextId("modules");
  const payload = await parseBody(req);
  if (!payload.title || payload.module_number === undefined) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }
  const moduleNumber = Number(payload.module_number);
  if (Number.isNaN(moduleNumber)) {
    return sendJson(res, 400, { detail: "Invalid module_number" });
  }

  const moduleRecord = {
    id: moduleId,
    title: normalizeNullableField(payload.title),
    module_number: moduleNumber,
    course_id: courseId,
  };

  db.modules.push(moduleRecord);

  return sendJson(res, 201, serializeModule(moduleRecord));
}

export async function updateModule(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const moduleId = Number(params.module_id);
  const moduleRecord = db.modules.find(
    (moduleItem) => moduleItem.id === moduleId && moduleItem.course_id === courseId
  );
  if (!moduleRecord) {
    return sendJson(res, 404, { detail: "Module not found" });
  }
  const payload = await parseBody(req);
  for (const key in payload) {
    if (!MODULE_UPDATABLE_FIELDS.has(key)) continue;
    if (key === "module_number") {
      const moduleNumber = Number(payload[key]);
      if (Number.isNaN(moduleNumber)) continue;
      moduleRecord[key] = moduleNumber;
      continue;
    }
    moduleRecord[key] = normalizeNullableField(payload[key]);
  }

  return sendJson(res, 200, serializeModule(moduleRecord));
}

export function deleteModule(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const moduleId = Number(params.module_id);
  const modulesBeforeDelete = db.modules.length;

  db.modules = db.modules.filter(
    (moduleRecord) => !(moduleRecord.id === moduleId && moduleRecord.course_id === courseId)
  );
  if (db.modules.length === modulesBeforeDelete) {
    return sendJson(res, 404, { detail: "Module not found" });
  }

  const deletedLessonIds = [];
  db.lessons = db.lessons.filter(lessonRecord => {
    if (lessonRecord.module_id === moduleId) {
      deletedLessonIds.push(lessonRecord.id);
      return false;
    }
    return true;
  });

  db.materials = db.materials.filter(materialRecord => !deletedLessonIds.includes(materialRecord.lesson_id));

  return sendNoContent(res, 204);
}
