import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField } from "../utils/normalize.js";
import { requireAuth } from "./auth.js";

const STUDENT_UPDATABLE_FIELDS = new Set([
  "first_name",
  "last_name",
  "phone",
  "birth_date",
  "password",
  "login"
]);

export function getStudents(req, res) {
  if (!requireAuth(req, res)) return;
  const studentList = db.students.map((studentRecord) => serializeStudentListItem(studentRecord));
  return sendJson(res, 200, {
    data: studentList
  });
}

export function getStudentById(req, res, params) {
  if (!requireAuth(req, res)) return;
  const studentId = Number(params.id);
  const studentRecord = db.students.find((student) => student.id === studentId);
  if (!studentRecord) return sendJson(res, 404, { detail: "Student not Found" });
  return sendJson(res, 200, serializeStudentDetails(studentRecord));
}

export async function createStudent(req, res) {
  if (!requireAuth(req, res)) return;
  const studentId = nextId("students");
  const payload = await parseBody(req);

  if (!payload.first_name || !payload.last_name || !payload.login || !payload.password) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const userExists = db.users.find((user) => user.login === payload.login);
  if (userExists) {
    return sendJson(res, 400, { detail: "User already exists" });
  }

  const userId = nextId("users");

  const studentRecord = {
    id: studentId,
    user_id: userId,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: normalizeNullableField(payload?.phone),
    birth_date: normalizeNullableField(payload?.birth_date),
  };

  const userRecord = {
    id: userId,
    login: payload.login,
    password: payload.password,
    role: "student"
  };

  db.users.push(userRecord)

  const targetGroupIds = (payload?.group_ids ?? []).map((groupId) => Number(groupId));
  db.groups.filter((group) => targetGroupIds.includes(group.id)).forEach((group) => {
    if (group.student_ids.includes(studentId)) return;
    group.student_ids.push(studentId);
  });
  db.students.push(studentRecord);

  return sendJson(res, 201, serializeStudentDetails(studentRecord));
}

export async function updateStudent(req, res, params) {
  if (!requireAuth(req, res)) return;
  const studentId = Number(params.id);
  const studentRecord = db.students.find((student) => student.id === studentId);
  if (!studentRecord) return sendJson(res, 404, { detail: "Student not Found" });
  const userRecord = db.users.find((user) => user.id === studentRecord.user_id);
  if (!userRecord) return sendJson(res, 404, { detail: "User not Found" });

  const payload = await parseBody(req);

  if (payload.login !== undefined) {
    const loginOwner = db.users.find((user) => user.login === payload.login);
    if (loginOwner && loginOwner.id !== userRecord.id) {
      return sendJson(res, 400, { detail: "User already exists" });
    }
  }

  for (const key in payload) {
    if (key === "group_ids") continue;
    if (!STUDENT_UPDATABLE_FIELDS.has(key)) continue;
    if (key === "login" || key === "password") {
      userRecord[key] = payload[key];
      continue;
    }
    if (key === "phone" || key === "birth_date") {
      studentRecord[key] = normalizeNullableField(payload[key]);
      continue;
    }
    studentRecord[key] = payload[key];
  }

  if (payload.group_ids !== undefined && Array.isArray(payload.group_ids)) {
    const targetGroupIds = payload.group_ids.map((groupId) => Number(groupId));
    db.groups.forEach((group) => {
      group.student_ids = group.student_ids.filter((existingStudentId) => existingStudentId !== studentId);
      if (!targetGroupIds.includes(group.id)) return;
      group.student_ids.push(studentId);
    });
  }

  return sendJson(res, 200, serializeStudentDetails(studentRecord));
}

export function deleteStudent(req, res, params) {
  if (!requireAuth(req, res)) return;
  const studentId = Number(params.id);
  const userId = db.students.find(student => student.id === studentId)?.user_id;
  if (!userId) return sendJson(res, 404, { detail: "Student not Found" });

  db.students = db.students.filter((student) => student.id !== studentId);
  db.groups.forEach((group) => {
    if (!group.student_ids.includes(studentId)) return;
    group.student_ids = group.student_ids.filter((id) => id !== studentId);
  });
  db.users = db.users.filter((user) => user.id !== userId);

  return sendNoContent(res, 204);
}

function serializeStudentListItem(studentRecord) {
  const groupIds = db.groups
    .filter((group) => group.student_ids.includes(studentRecord.id))
    .map((group) => group.id);

  const userData = db.users.find((user) => user.id === studentRecord.user_id);
  if (!userData) throw { detail: "User Data not Found" };

  return {
    ...studentRecord,
    login: userData.login,
    groups_count: groupIds.length,
  };
}

function serializeStudentDetails(studentRecord) {
  const groups = db.groups
    .filter((group) => group.student_ids.includes(studentRecord.id))
    .map((group) => ({ id: group.id, group_number: group.group_number }));

  const userData = db.users.find((user) => user.id === studentRecord.user_id);
  if (!userData) throw { detail: "User Data not Found" };

  return {
    ...studentRecord,
    login: userData.login,
    group_ids: groups.map((group) => group.id),
    groups,
  };
}
