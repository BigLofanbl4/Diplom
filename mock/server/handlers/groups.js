import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableId } from "../utils/normalize.js";
import { requireAuth } from "./auth.js";

const GROUP_UPDATABLE_FIELDS = new Set([
  "group_number",
  "teacher_id",
  "course_id",
]);

export function getGroups(req, res) {
  if (!requireAuth(req, res)) return;
  const groupsList = db.groups.map(groupRecord => serializeGroup(groupRecord));
  return sendJson(res, 200, groupsList);
}

export function getGroupById(req, res, params) {
  if (!requireAuth(req, res)) return;
  const groupId = Number(params.id);
  const groupRecord = db.groups.find(group => group.id === groupId);
  if (!groupRecord) {
    return sendJson(res, 404, { detail: "Group not found" });
  }
  return sendJson(res, 200, serializeGroup(groupRecord));
}

export async function createGroup(req, res) {
  if (!requireAuth(req, res)) return;
  const groupId = nextId("groups");
  const payload = await parseBody(req);
  if (!payload.group_number) {
    return sendJson(res, 400, { detail: "Missing required field" });
  }

  const teacherId = normalizeNullableId(payload.teacher_id);
  const courseId = normalizeNullableId(payload.course_id);

  const studentIds = Array.isArray(payload.student_ids)
    ? payload.student_ids.map((studentId) => Number(studentId)).filter((studentId) => !Number.isNaN(studentId))
    : [];

  const groupRecord = {
    id: groupId,
    group_number: payload.group_number,
    student_ids: studentIds,
    teacher_id: teacherId,
    course_id: courseId,
  };

  db.groups.push(groupRecord);

  return sendJson(res, 201, serializeGroup(groupRecord));
}

export async function updateGroup(req, res, params) {
  if (!requireAuth(req, res)) return;
  const groupId = Number(params.id);
  const groupRecord = db.groups.find(group => group.id === groupId);
  if (!groupRecord) {
    return sendJson(res, 404, { detail: "Group not found" });
  }

  const payload = await parseBody(req)

  for (const key in payload) {
    if (key === "student_ids") continue;
    if (!GROUP_UPDATABLE_FIELDS.has(key)) continue;
    if (key === "group_number") {
      groupRecord[key] = payload[key];
      continue;
    }
    if (key === "teacher_id" || key === "course_id") {
      groupRecord[key] = normalizeNullableId(payload[key]);
      continue;
    }
    groupRecord[key] = payload[key];
  }

  if (payload.student_ids !== undefined) {
    const studentIds = Array.isArray(payload.student_ids)
      ? payload.student_ids.map(studentId => Number(studentId)).filter((studentId) => !Number.isNaN(studentId))
      : [];
    groupRecord.student_ids = studentIds;
  }

  return sendJson(res, 200, serializeGroup(groupRecord));
}

export function deleteGroup(req, res, params) {
  if (!requireAuth(req, res)) return;
  const groupId = Number(params.id);
  const groupsBeforeDelete = db.groups.length;
  db.groups = db.groups.filter(group => group.id !== groupId);
  if (db.groups.length === groupsBeforeDelete) {
    return sendJson(res, 404, { detail: "Group not found" });
  }

  return sendNoContent(res, 204);
}

function serializeGroup(groupRecord) {
  const students = db.students
    .filter((student => groupRecord.student_ids.includes(student.id)))

  return {
    ...groupRecord,
    students
  }
}
