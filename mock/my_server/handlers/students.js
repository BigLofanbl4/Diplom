import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField } from "../utils/normalize.js";

export function getStudents(_req, res) {
  const studentList = db.students.map((studentRecord) => serializeStudent(studentRecord));
  return sendJson(res, 200, studentList);
}

export function getStudentById(_req, res, params) {
  const studentId = Number(params.id);
  const studentRecord = db.students.find((student) => student.id === studentId);
  if (!studentRecord) return sendJson(res, 404, { detail: "Student not Found" });
  return sendJson(res, 200, serializeStudent(studentRecord));
}

export async function createStudent(req, res) {
  const studentId = nextId("students");
  const payload = await parseBody(req);

  if (!payload.first_name || !payload.last_name) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const studentRecord = {
    id: studentId,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: normalizeNullableField(payload?.phone),
    birth_date: normalizeNullableField(payload?.birth_date),
  };

  const targetGroupIds = (payload?.group_ids ?? []).map((groupId) => Number(groupId));
  db.groups.filter((group) => targetGroupIds.includes(group.id)).forEach((group) => {
    if (group.student_ids.includes(studentId)) return;
    group.student_ids.push(studentId);
  });
  db.students.push(studentRecord);

  return sendJson(res, 201, serializeStudent(studentRecord));
}

export async function updateStudent(req, res, params) {
  const studentId = Number(params.id);
  const studentRecord = db.students.find((student) => student.id === studentId);
  if (!studentRecord) return sendJson(res, 404, { detail: "Student not Found" });

  const payload = await parseBody(req);

  for (const key in payload) {
    if (key === "group_ids") continue;
    if (key === "phone" || key === "birth_date") {
      studentRecord[key] = normalizeNullableField(payload[key]);
      continue;
    }
    studentRecord[key] = payload[key];
  }

  if (payload.group_ids !== undefined) {
    const targetGroupIds = payload.group_ids.map((groupId) => Number(groupId));
    db.groups.forEach((group) => {
      group.student_ids = group.student_ids.filter((existingStudentId) => existingStudentId !== studentId);
      if (!targetGroupIds.includes(group.id)) return;
      group.student_ids.push(studentId);
    });
  }

  return sendJson(res, 200, serializeStudent(studentRecord));
}

export function deleteStudent(_req, res, params) {
  const studentId = Number(params.id);
  const studentsBeforeDelete = db.students.length;
  db.students = db.students.filter((student) => student.id !== studentId);
  if (db.students.length === studentsBeforeDelete) {
    return sendJson(res, 404, { detail: "Student not Found" });
  }

  return sendNoContent(res, 204);
}

function serializeStudent(studentRecord) {
  const groups = db.groups
    .filter((group) => group.student_ids.includes(studentRecord.id))
    .map((group) => ({ id: group.id, group_number: group.group_number }));

  return {
    ...studentRecord,
    groups,
  };
}
