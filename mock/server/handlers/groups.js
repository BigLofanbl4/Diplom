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
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = url.searchParams;

  const limit = parseInt(params.get("limit"), 10);
  const offset = parseInt(params.get("offset"), 10) || 0;
  const search = params.get("search");

  let groupsList = db.groups.map(groupRecord => serializeGroupListItem(groupRecord));
  if (search !== null) {
    groupsList = groupsList.filter((group) => group.group_number.includes(search));
  }

  let start = isNaN(offset) ? 0 : offset;
  let end = isNaN(limit) ? undefined : limit;

  groupsList = groupsList.slice(start, end);
  return sendJson(res, 200, {
    data: groupsList,
    meta: {
      totals: db.groups.length,
      limit: limit,
      offset: offset,
      search: search,
    }
  });
}

export function getGroupById(req, res, params) {
  if (!requireAuth(req, res)) return;
  const groupId = Number(params.id);
  const groupRecord = db.groups.find(group => group.id === groupId);
  if (!groupRecord) {
    return sendJson(res, 404, { detail: "Group not found" });
  }
  return sendJson(res, 200, serializeGroupDetails(groupRecord));
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

  return sendJson(res, 201, serializeGroupDetails(groupRecord));
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

  return sendJson(res, 200, serializeGroupDetails(groupRecord));
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

function serializeGroupListItem(groupRecord) {
  const course = db.courses.find(course => course.id === groupRecord.course_id) ?? null;
  return {
    id: groupRecord.id,
    group_number: groupRecord.group_number,
    teacher_id: groupRecord.teacher_id,
    course,
    course_id: groupRecord.course_id,
    students_count: groupRecord.student_ids.length,
  };
}

function serializeGroupDetails(groupRecord) {
  const students = db.students
    .filter((student => groupRecord.student_ids.includes(student.id)))

  const course = db.courses.find((course) => course.id === groupRecord.course_id);

  const teacher = db.teachers.find((teacher) => teacher.id === groupRecord.teacher_id);

  return {
    ...groupRecord,
    teacher,
    students,
    course
  }
}
