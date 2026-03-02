import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField, normalizeNullableId } from "../utils/normalize.js";
import { requireAuth } from "./auth.js";

const TEACHER_UPDATABLE_FIELDS = new Set([
  "login",
  "password",
  "first_name",
  "last_name",
  "phone",
  "age",
  "birth_date",
  "is_ovz",
  "organization_id",
]);

export function getTeachers(req, res) {
  if (!requireAuth(req, res)) return;
  const teachersList = db.teachers.map(teacherRecord => serializeTeacher(teacherRecord));
  return sendJson(res, 200, teachersList);
}

export function getTeacherById(req, res, params) {
  if (!requireAuth(req, res)) return;
  const teacherId = Number(params.id);
  const teacherRecord = db.teachers.find((teacher) => teacher.id === teacherId);
  if (!teacherRecord) return sendJson(res, 404, { detail: "Teacher not found" });
  return sendJson(res, 200, serializeTeacher(teacherRecord));
}

export async function createTeacher(req, res) {
  if (!requireAuth(req, res)) return;
  const teacherId = nextId("teachers");
  const payload = await parseBody(req);

  if (!payload.login || !payload.password || !payload.first_name || !payload.last_name) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const userExists = db.users.find(user => user.login === payload.login);
  if (userExists) {
    return sendJson(res, 400, { detail: "User already exists" });
  }

  const userId = nextId("users");

  const teacherRecord = {
    id: teacherId,
    user_id: userId,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: normalizeNullableField(payload.phone),
    age: normalizeNullableId(payload.age),
    birth_date: normalizeNullableField(payload.birth_date),
    is_ovz: normalizeNullableField(payload.is_ovz),
    organization_id: normalizeNullableId(payload.organization_id),
  };

  const userRecord = {
    id: userId,
    login: payload.login,
    password: payload.password,
    role: "teacher"
  };

  if (payload.group_ids) {
    const targetGroupIds = payload.group_ids.map((groupId) => Number(groupId));
    db.groups
      .filter((group) => targetGroupIds.includes(group.id))
      .forEach((group) => {
        group.teacher_id = teacherId;
      });
  }

  db.users.push(userRecord);
  db.teachers.push(teacherRecord);

  return sendJson(res, 201, serializeTeacher(teacherRecord));
}

export async function updateTeacher(req, res, params) {
  if (!requireAuth(req, res)) return;
  const teacherId = Number(params.id);
  const teacherRecord = db.teachers.find((teacher) => teacher.id === teacherId);
  if (!teacherRecord) return sendJson(res, 404, { detail: "Teacher not found" });
  const userRecord = db.users.find((user) => user.id === teacherRecord.user_id);
  if (!userRecord) return sendJson(res, 404, { detail: "User not found" });

  const payload = await parseBody(req);

  if (payload.login !== undefined) {
    const loginOwner = db.users.find((user) => user.login === payload.login);

    if (loginOwner && loginOwner.id !== userRecord.id) {
      return sendJson(res, 400, { detail: "User already exists" });
    }
  }

  for (const key in payload) {
    if (key === "group_ids") continue;
    if (!TEACHER_UPDATABLE_FIELDS.has(key)) continue;

    if (key === "organization_id" || key === "age") {
      teacherRecord[key] = normalizeNullableId(payload[key]);
      continue;
    }
    if (key === "phone" || key === "birth_date" || key === "is_ovz") {
      teacherRecord[key] = normalizeNullableField(payload[key]);
      continue;
    }

    if (key === "login" || key === "password") {
      userRecord[key] = payload[key];
      continue;
    }

    teacherRecord[key] = payload[key];
  }

  if (payload.group_ids !== undefined && Array.isArray(payload.group_ids)) {
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

export function deleteTeacher(req, res, params) {
  if (!requireAuth(req, res)) return;
  const teacherId = Number(params.id);
  const userId = db.teachers.find((teacher) => teacher.id === teacherId)?.user_id;

  if (!userId) {
    return sendJson(res, 404, { detail: "Teacher not found" });
  }

  db.teachers = db.teachers.filter((teacher) => teacher.id !== teacherId);

  db.groups.forEach(group => {
    if (group.teacher_id !== teacherId) return;
    group.teacher_id = null;
  });

  db.users = db.users.filter((user) => user.id !== userId);

  return sendNoContent(res, 204);
}

function serializeTeacher(teacherRecord) {
  const groups = db.groups
    .filter(group => group.teacher_id === teacherRecord.id)
    .map(group => ({ id: group.id, group_number: group.group_number }))

  const userData = db.users.find(user => user.id === teacherRecord.user_id);

  if (!userData) {
    throw {
      detail: "User Data not found"
    }
  }

  return {
    ...teacherRecord,
    login: userData.login,
    groups
  }
}
