import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField, normalizeNullableId } from "../utils/normalize.js";

export function getTeachers(_req, res) {
  const teachersList = db.teachers.map(teacherRecord => serializeTeacher(teacherRecord));
  return sendJson(res, 200, teachersList);
}

export function getTeacherById(_req, res, params) {
  const teacherId = Number(params.id);
  const teacherRecord = db.teachers.find((teacher) => teacher.id === teacherId);
  if (!teacherRecord) return sendJson(res, 404, { detail: "Teacher not found" });
  return sendJson(res, 200, serializeTeacher(teacherRecord));
}

export async function createTeacher(req, res) {
  const teacherId = nextId("teachers");
  const payload = await parseBody(req);

  if (!payload.login || !payload.password || !payload.first_name || !payload.last_name) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const teacherRecord = {
    id: teacherId,
    login: payload.login,
    password: payload.password,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: normalizeNullableField(payload.phone),
    age: normalizeNullableId(payload.age),
    birth_date: normalizeNullableField(payload.birth_date),
    is_ovz: normalizeNullableField(payload.is_ovz),
    organization_id: normalizeNullableId(payload.organization_id),
  };

  if (payload.group_ids) {
    const targetGroupIds = payload.group_ids.map((groupId) => Number(groupId));
    db.groups
      .filter((group) => targetGroupIds.includes(group.id))
      .forEach((group) => {
        group.teacher_id = teacherId;
      });
  }

  db.teachers.push(teacherRecord);

  return sendJson(res, 201, serializeTeacher(teacherRecord));
}

export async function updateTeacher(req, res, params) {
  const teacherId = Number(params.id);
  const teacherRecord = db.teachers.find((teacher) => teacher.id === teacherId);
  if (!teacherRecord) return sendJson(res, 404, { detail: "Teacher not found" });

  const payload = await parseBody(req);

  for (const key in payload) {
    if (key === "group_ids") continue;

    if (key === "organization_id" || key === "age") {
      teacherRecord[key] = normalizeNullableId(payload[key]);
      continue;
    }
    if (key === "phone" || key === "birth_date" || key === "is_ovz") {
      teacherRecord[key] = normalizeNullableField(payload[key]);
      continue;
    }
    teacherRecord[key] = payload[key];
  }

  if (payload.group_ids !== undefined) {
    const targetGroupIds = payload.group_ids.map((groupId) => Number(groupId));
    db.groups.forEach((group) => {
      if (group.teacher_id === teacherId) {
        group.teacher_id = null;
      }
      if (targetGroupIds.includes(group.id)) {
        group.teacher_id = teacherId;
      }
    });
  }

  return sendJson(res, 200, serializeTeacher(teacherRecord));
}

export function deleteTeacher(_req, res, params) {
  const teacherId = Number(params.id);
  const teachersBeforeDelete = db.teachers.length;
  db.teachers = db.teachers.filter((teacher) => teacher.id !== teacherId);

  if (db.teachers.length === teachersBeforeDelete) {
    return sendJson(res, 404, { detail: "Teacher not found" });
  }

  db.groups.forEach(group => {
    if (group.teacher_id !== teacherId) return;
    group.teacher_id = null;
  });

  return sendNoContent(res, 204);
}

function serializeTeacher(teacherRecord) {
  const groups = db.groups
    .filter(group => group.teacher_id === teacherRecord.id)
    .map(group => ({ id: group.id, group_number: group.group_number }))

  return {
    ...teacherRecord,
    groups
  }
}
