import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField, normalizeNullableId } from "../utils/normalize.js";
import {
  getTeacherAvailabilityForGroup,
  getTeacherAvailabilityForReplacement,
  normalizeScheduleSlots,
} from "../utils/teacherAvailability.js";
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
  "course_ids",
  "schedule_preferences",
]);

export function getTeachers(req, res) {
  if (!requireAuth(req, res)) return;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const params = url.searchParams;

  const limit = parseInt(params.get("limit"), 10);
  const offset = parseInt(params.get("offset"), 10) || 0;
  const search = params.get("search");
  const groupId = Number(params.get("group_id"));
  const replacementDate = params.get("replacement_date");
  const replacementStart = params.get("replacement_start");
  const replacementEnd = params.get("replacement_end");

  const groupRecord = Number.isNaN(groupId) ? null : db.groups.find((group) => group.id === groupId) ?? null;

  let teacherList = db.teachers.map((teacher) => serializeTeacherListItem(teacher, { groupRecord, replacementDate, replacementStart, replacementEnd }));
  if (search !== null) {
    teacherList = teacherList.filter((teacher) => {
      const fullName = `${teacher.last_name} ${teacher.first_name}`;
      return fullName.includes(search);
    });
  }

  let start = isNaN(offset) ? 0 : offset;
  let end = isNaN(limit) ? undefined : offset + limit;

  teacherList = teacherList.slice(start, end);
  return sendJson(res, 200, {
    data: teacherList,
    meta: {
      totals: db.teachers.length,
      limit: limit,
      offset: offset,
      search: search,
    }
  });
}

export function getTeacherById(req, res, params) {
  if (!requireAuth(req, res)) return;
  const teacherId = Number(params.id);
  const teacherRecord = db.teachers.find((teacher) => teacher.id === teacherId);
  if (!teacherRecord) return sendJson(res, 404, { detail: "Teacher not found" });
  return sendJson(res, 200, serializeTeacherDetails(teacherRecord));
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
    course_ids: Array.isArray(payload.course_ids) ? payload.course_ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id)) : [],
    schedule_preferences: normalizeScheduleSlots(payload.schedule_preferences),
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

  return sendJson(res, 201, serializeTeacherDetails(teacherRecord));
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
    if (key === "course_ids") {
      teacherRecord[key] = Array.isArray(payload[key])
        ? payload[key].map((id) => Number(id)).filter((id) => !Number.isNaN(id))
        : [];
      continue;
    }
    if (key === "schedule_preferences") {
      teacherRecord[key] = normalizeScheduleSlots(payload[key]);
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

  return sendJson(res, 200, serializeTeacherDetails(teacherRecord));
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

function serializeTeacherListItem(teacherRecord, { groupRecord = null, replacementDate = null, replacementStart = null, replacementEnd = null } = {}) {
  const groupIds = db.groups
    .filter(group => group.teacher_id === teacherRecord.id)
    .map(group => group.id);

  const userData = db.users.find(user => user.id === teacherRecord.user_id);
  if (!userData) throw { detail: "User Data not found" };

  const availabilityForGroup = groupRecord
    ? getTeacherAvailabilityForGroup({
        db,
        teacherRecord,
        groupRecord,
      })
    : null;

  const availabilityForReplacement = replacementDate && replacementStart && replacementEnd
    ? getTeacherAvailabilityForReplacement({
        db,
        teacherRecord,
        date: replacementDate,
        start: replacementStart,
        end: replacementEnd,
      })
    : null;

  return {
    ...teacherRecord,
    login: userData.login,
    groups_count: groupIds.length,
    availability_for_group: availabilityForGroup,
    availability_for_replacement: availabilityForReplacement,
  };
}

function serializeTeacherDetails(teacherRecord) {
  const groups = db.groups
    .filter(group => group.teacher_id === teacherRecord.id)
    .map(group => {
      const course = db.courses.find((course) => course.id === group.course_id) ?? null;
      return {
        id: group.id,
        group_number: group.group_number,
        course_id: group.course_id,
        course: course
      };
    });

  const userData = db.users.find(user => user.id === teacherRecord.user_id);

  if (!userData) {
    throw {
      detail: "User Data not found"
    }
  }

  return {
    ...teacherRecord,
    login: userData.login,
    group_ids: groups.map((group) => group.id),
    groups,
    course_ids: teacherRecord.course_ids ?? [],
    schedule_preferences: teacherRecord.schedule_preferences ?? [],
  }
}
