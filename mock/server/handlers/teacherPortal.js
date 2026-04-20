import { db } from "../db.js";
import { parseBody, sendJson } from "../utils/http.js";
import { ensureCourseInstance, findCourseInstanceByGroupId } from "../utils/courseTemplates.js";
import { serializeCourse, serializeCourseDetails } from "../utils/serializers.js";
import { requireAuth } from "./auth.js";

export function getMyGroups(req, res) {
  const teacherContext = getTeacherContext(req, res);
  if (!teacherContext) return;

  const groups = db.groups
    .filter((groupRecord) => groupRecord.teacher_id === teacherContext.teacher.id)
    .map((groupRecord) => serializeTeacherGroup(groupRecord));

  return sendJson(res, 200, { data: groups });
}

export function getMyGroupById(req, res, params) {
  const teacherContext = getTeacherContext(req, res);
  if (!teacherContext) return;

  const groupId = Number(params.groupId);
  const groupRecord = db.groups.find(
    (group) => group.id === groupId && group.teacher_id === teacherContext.teacher.id
  );

  if (!groupRecord) {
    return sendJson(res, 404, { detail: "Group not found" });
  }

  const instanceCourse = groupRecord.course_id ? ensureCourseInstance(groupRecord) : null;
  const templateCourse = db.courses.find((course) => course.id === groupRecord.course_id) ?? null;

  return sendJson(res, 200, {
    ...serializeTeacherGroup(groupRecord),
    students: db.students.filter((student) => groupRecord.student_ids.includes(student.id)),
    course_template: templateCourse ? serializeCourse(templateCourse) : null,
    course_instance: instanceCourse ? serializeCourseDetails(instanceCourse) : null,
  });
}

export function getMyPreferences(req, res) {
  const teacherContext = getTeacherContext(req, res);
  if (!teacherContext) return;

  return sendJson(res, 200, serializePreferences(teacherContext.teacher));
}

export async function updateMyPreferences(req, res) {
  const teacherContext = getTeacherContext(req, res);
  if (!teacherContext) return;

  const payload = await parseBody(req);

  teacherContext.teacher.course_ids = Array.isArray(payload.course_ids)
    ? payload.course_ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    : [];

  teacherContext.teacher.schedule_preferences = Array.isArray(payload.schedule_preferences)
    ? payload.schedule_preferences
        .map((slot) => ({
          id: slot.id || crypto.randomUUID(),
          day: slot.day ?? "",
          start: slot.start ?? "",
          end: slot.end ?? "",
        }))
        .filter((slot) => slot.day && slot.start && slot.end)
    : [];

  return sendJson(res, 200, serializePreferences(teacherContext.teacher));
}

function getTeacherContext(req, res) {
  const authContext = requireAuth(req, res);
  if (!authContext) return null;

  const user = db.users.find((userRecord) => userRecord.id === authContext.userId);
  if (!user || user.role !== "teacher") {
    sendJson(res, 403, { detail: "Teacher access required" });
    return null;
  }

  const teacher = db.teachers.find((teacherRecord) => teacherRecord.user_id === user.id);
  if (!teacher) {
    sendJson(res, 404, { detail: "Teacher profile not found" });
    return null;
  }

  return { user, teacher };
}

function serializeTeacherGroup(groupRecord) {
  const templateCourse = db.courses.find((course) => course.id === groupRecord.course_id) ?? null;
  const instanceCourse = findCourseInstanceByGroupId(groupRecord.id);

  return {
    id: groupRecord.id,
    group_number: groupRecord.group_number,
    student_ids: groupRecord.student_ids,
    students_count: groupRecord.student_ids.length,
    course_template: templateCourse ? serializeCourse(templateCourse) : null,
    course_instance: instanceCourse ? serializeCourse(instanceCourse) : null,
    has_course_instance: Boolean(instanceCourse),
  };
}

function serializePreferences(teacherRecord) {
  const availableCourses = db.courses
    .filter((course) => course.kind === "template")
    .map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      selected: (teacherRecord.course_ids ?? []).includes(course.id),
    }));

  return {
    teacher_id: teacherRecord.id,
    course_ids: teacherRecord.course_ids ?? [],
    schedule_preferences: teacherRecord.schedule_preferences ?? [],
    available_courses: availableCourses,
  };
}
