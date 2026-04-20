import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField } from "../utils/normalize.js";
import { serializeModule } from "../utils/serializers.js";
import {
  findTemplateModule,
  getTemplateModuleLimit,
  isInstanceCourse,
  isTemplateCourse,
} from "../utils/courseTemplates.js";
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
  if (payload.module_number === undefined) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }
  const moduleNumber = Number(payload.module_number);
  if (Number.isNaN(moduleNumber)) {
    return sendJson(res, 400, { detail: "Invalid module_number" });
  }

  if (db.modules.some((moduleRecord) => moduleRecord.course_id === courseId && moduleRecord.module_number === moduleNumber)) {
    return sendJson(res, 400, { detail: "Module with this number already exists" });
  }

  let title = normalizeNullableField(payload.title);

  if (isInstanceCourse(courseRecord)) {
    const limit = getTemplateModuleLimit(courseRecord);
    if (moduleNumber > limit) {
      return sendJson(res, 400, { detail: `Module ${moduleNumber} exceeds template limit ${limit}` });
    }

    const templateModule = findTemplateModule(courseRecord, moduleNumber);
    if (!templateModule) {
      return sendJson(res, 400, { detail: "Template module not found" });
    }

    title = templateModule.title;
  }

  const moduleRecord = {
    id: moduleId,
    title,
    module_number: moduleNumber,
    course_id: courseId,
  };

  db.modules.push(moduleRecord);

  if (isTemplateCourse(courseRecord)) {
    courseRecord.max_modules_count = Math.max(courseRecord.max_modules_count ?? 0, moduleNumber);
  }

  return sendJson(res, 201, serializeModule(moduleRecord));
}

export async function updateModule(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const moduleId = Number(params.module_id);
  const courseRecord = db.courses.find((course) => course.id === courseId);
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

      if (db.modules.some(
        (moduleItem) => (
          moduleItem.course_id === courseId &&
          moduleItem.id !== moduleId &&
          moduleItem.module_number === moduleNumber
        )
      )) {
        continue;
      }

      if (courseRecord && isInstanceCourse(courseRecord)) {
        const limit = getTemplateModuleLimit(courseRecord);
        if (moduleNumber > limit || !findTemplateModule(courseRecord, moduleNumber)) {
          continue;
        }
      }

      moduleRecord[key] = moduleNumber;
      continue;
    }
    moduleRecord[key] = normalizeNullableField(payload[key]);
  }

  if (courseRecord && isTemplateCourse(courseRecord)) {
    courseRecord.max_modules_count = db.modules
      .filter((moduleItem) => moduleItem.course_id === courseId)
      .reduce((max, moduleItem) => Math.max(max, moduleItem.module_number), 0);
  }

  return sendJson(res, 200, serializeModule(moduleRecord));
}

export function deleteModule(req, res, params) {
  if (!requireAuth(req, res)) return;
  const courseId = Number(params.course_id);
  const moduleId = Number(params.module_id);
  const courseRecord = db.courses.find((course) => course.id === courseId);
  const modulesBeforeDelete = db.modules.length;

  db.modules = db.modules.filter(
    (moduleRecord) => !(moduleRecord.id === moduleId && moduleRecord.course_id === courseId)
  );
  if (db.modules.length === modulesBeforeDelete) {
    return sendJson(res, 404, { detail: "Module not found" });
  }

  if (courseRecord && isTemplateCourse(courseRecord)) {
    courseRecord.max_modules_count = db.modules
      .filter((moduleRecord) => moduleRecord.course_id === courseId)
      .reduce((max, moduleRecord) => Math.max(max, moduleRecord.module_number), 0);
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
  const deletedTestIds = db.tests
    .filter((testRecord) => deletedLessonIds.includes(testRecord.lesson_id) && testRecord.course_id === courseId)
    .map((testRecord) => testRecord.id);
  db.tests = db.tests.filter((testRecord) => !deletedTestIds.includes(testRecord.id));
  db.questions = db.questions.filter((questionRecord) => !deletedTestIds.includes(questionRecord.test_id));

  return sendNoContent(res, 204);
}
