import { db } from "../db.js";
import { parseBody, sendJson } from "../utils/http.js";
import { ensureCourseInstance, findCourseInstanceByGroupId } from "../utils/courseTemplates.js";
import { serializeCourse, serializeCourseDetails } from "../utils/serializers.js";
import { requireAuth } from "./auth.js";

const HOMEWORK_REVIEW_STATUSES = new Set(["pending", "approved", "needs_revision"]);

export function getMyGroups(req, res) {
  const teacherContext = getTeacherContext(req, res);
  if (!teacherContext) return;

  const groups = db.groups
    .filter((groupRecord) => groupRecord.teacher_id === teacherContext.teacher.id)
    .map((groupRecord) => serializeTeacherGroup(groupRecord));

  return sendJson(res, 200, { data: groups });
}

export function getMyGroupById(req, res, params) {
  const groupContext = getTeacherGroupContext(req, res, params);
  if (!groupContext) return;

  const { groupRecord, instanceCourse } = groupContext;
  const templateCourse = db.courses.find((course) => course.id === groupRecord.course_id) ?? null;
  const baseCourseDetails = instanceCourse ? serializeCourseDetails(instanceCourse) : null;
  const courseDetails = baseCourseDetails
    ? {
        ...baseCourseDetails,
        lessons: baseCourseDetails.lessons.map((lesson) => ({
          ...lesson,
          homework_review: buildHomeworkReviewStats(groupRecord, instanceCourse.id, lesson.id),
          test_review: buildTestReviewStats(groupRecord, instanceCourse.id, lesson.id),
        })),
      }
    : null;

  return sendJson(res, 200, {
    ...serializeTeacherGroup(groupRecord),
    students: db.students.filter((student) => groupRecord.student_ids.includes(student.id)),
    course_template: templateCourse ? serializeCourse(templateCourse) : null,
    course_instance: courseDetails,
  });
}

export function getMyLessonHomeworkSubmissions(req, res, params) {
  const lessonContext = getTeacherLessonContext(req, res, params);
  if (!lessonContext) return;

  const { groupRecord, instanceCourse, lessonRecord } = lessonContext;
  const studentItems = groupRecord.student_ids.map((studentId) => {
    const student = db.students.find((studentRecord) => studentRecord.id === studentId);
    const submission = getLatestHomeworkSubmission(studentId, instanceCourse.id, lessonRecord.id);

    return {
      student: serializeStudent(student),
      submission: submission ? serializeHomeworkSubmission(submission) : null,
    };
  });

  return sendJson(res, 200, {
    lesson: serializeLessonBrief(lessonRecord),
    stats: buildHomeworkReviewStats(groupRecord, instanceCourse.id, lessonRecord.id),
    data: studentItems,
  });
}

export async function reviewMyLessonHomeworkSubmission(req, res, params) {
  const lessonContext = getTeacherLessonContext(req, res, params);
  if (!lessonContext) return;

  const { teacher, groupRecord, instanceCourse, lessonRecord } = lessonContext;
  const submissionId = Number(params.submissionId);
  const submission = db.homework_submissions.find(
    (submissionRecord) => (
      submissionRecord.id === submissionId &&
      submissionRecord.course_id === instanceCourse.id &&
      submissionRecord.lesson_id === lessonRecord.id &&
      groupRecord.student_ids.includes(submissionRecord.student_id)
    )
  );

  if (!submission) {
    return sendJson(res, 404, { detail: "Homework submission not found" });
  }

  const payload = await parseBody(req);
  const nextStatus = HOMEWORK_REVIEW_STATUSES.has(payload.status) ? payload.status : submission.status ?? "pending";
  submission.status = nextStatus;
  submission.feedback = typeof payload.feedback === "string" ? payload.feedback.trim() : "";

  if (nextStatus === "pending") {
    submission.checked_at = null;
    submission.checked_by = null;
  } else {
    submission.checked_at = new Date().toISOString();
    submission.checked_by = teacher.id;
  }

  return sendJson(res, 200, serializeHomeworkSubmission(submission));
}

export function getMyLessonTestAttempts(req, res, params) {
  const lessonContext = getTeacherLessonContext(req, res, params);
  if (!lessonContext) return;

  const { groupRecord, instanceCourse, lessonRecord } = lessonContext;
  const studentItems = groupRecord.student_ids.map((studentId) => {
    const student = db.students.find((studentRecord) => studentRecord.id === studentId);
    const attempt = getLatestTestAttempt(studentId, instanceCourse.id, lessonRecord.id);

    return {
      student: serializeStudent(student),
      attempt: attempt ? serializeTestAttempt(attempt) : null,
    };
  });

  return sendJson(res, 200, {
    lesson: serializeLessonBrief(lessonRecord),
    stats: buildTestReviewStats(groupRecord, instanceCourse.id, lessonRecord.id),
    data: studentItems,
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

function getTeacherGroupContext(req, res, params) {
  const teacherContext = getTeacherContext(req, res);
  if (!teacherContext) return null;

  const groupId = Number(params.groupId);
  const groupRecord = db.groups.find(
    (group) => group.id === groupId && group.teacher_id === teacherContext.teacher.id
  );

  if (!groupRecord) {
    sendJson(res, 404, { detail: "Group not found" });
    return null;
  }

  const instanceCourse = groupRecord.course_id ? ensureCourseInstance(groupRecord) : null;

  return {
    ...teacherContext,
    groupRecord,
    instanceCourse,
  };
}

function getTeacherLessonContext(req, res, params) {
  const groupContext = getTeacherGroupContext(req, res, params);
  if (!groupContext) return null;

  if (!groupContext.instanceCourse) {
    sendJson(res, 404, { detail: "Course not found" });
    return null;
  }

  const lessonId = Number(params.lessonId);
  const lessonRecord = db.lessons.find(
    (lesson) => lesson.id === lessonId && lesson.course_id === groupContext.instanceCourse.id
  );

  if (!lessonRecord) {
    sendJson(res, 404, { detail: "Lesson not found" });
    return null;
  }

  return {
    ...groupContext,
    lessonRecord,
  };
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

function serializeStudent(studentRecord) {
  if (!studentRecord) return null;

  return {
    id: studentRecord.id,
    first_name: studentRecord.first_name,
    last_name: studentRecord.last_name,
  };
}

function serializeLessonBrief(lessonRecord) {
  return {
    id: lessonRecord.id,
    title: lessonRecord.title,
    lesson_number: lessonRecord.lesson_number,
  };
}

function serializeHomeworkSubmission(submissionRecord) {
  return {
    id: submissionRecord.id,
    student_id: submissionRecord.student_id,
    lesson_id: submissionRecord.lesson_id,
    course_id: submissionRecord.course_id,
    text: submissionRecord.text ?? "",
    files: submissionRecord.files ?? [],
    status: submissionRecord.status ?? "pending",
    feedback: submissionRecord.feedback ?? "",
    checked_at: submissionRecord.checked_at ?? null,
    checked_by: submissionRecord.checked_by ?? null,
    created_at: submissionRecord.created_at,
  };
}

function serializeTestAttempt(attemptRecord) {
  return {
    id: attemptRecord.id,
    student_id: attemptRecord.student_id,
    lesson_id: attemptRecord.lesson_id,
    course_id: attemptRecord.course_id,
    test_id: attemptRecord.test_id,
    score: attemptRecord.score,
    total: attemptRecord.total,
    answers: attemptRecord.answers ?? [],
    created_at: attemptRecord.created_at,
    is_passed: isAttemptPassed(attemptRecord),
  };
}

function buildHomeworkReviewStats(groupRecord, courseId, lessonId) {
  const submissions = groupRecord.student_ids
    .map((studentId) => getLatestHomeworkSubmission(studentId, courseId, lessonId))
    .filter(Boolean);

  const submittedCount = submissions.length;
  const approvedCount = submissions.filter((submission) => (submission.status ?? "pending") === "approved").length;
  const needsRevisionCount = submissions.filter((submission) => (submission.status ?? "pending") === "needs_revision").length;
  const pendingCount = submissions.filter((submission) => (submission.status ?? "pending") === "pending").length;

  return {
    total_students: groupRecord.student_ids.length,
    submitted_count: submittedCount,
    checked_count: approvedCount + needsRevisionCount,
    approved_count: approvedCount,
    needs_revision_count: needsRevisionCount,
    pending_count: pendingCount,
  };
}

function buildTestReviewStats(groupRecord, courseId, lessonId) {
  const attempts = groupRecord.student_ids
    .map((studentId) => getLatestTestAttempt(studentId, courseId, lessonId))
    .filter(Boolean);

  const passedCount = attempts.filter((attempt) => isAttemptPassed(attempt)).length;

  return {
    total_students: groupRecord.student_ids.length,
    attempted_count: attempts.length,
    passed_count: passedCount,
    failed_count: attempts.length - passedCount,
  };
}

function getLatestHomeworkSubmission(studentId, courseId, lessonId) {
  const submissions = db.homework_submissions
    .filter((submission) => submission.student_id === studentId && submission.course_id === courseId && submission.lesson_id === lessonId)
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

  return submissions[0] ?? null;
}

function getLatestTestAttempt(studentId, courseId, lessonId) {
  const attempts = db.test_attempts
    .filter((attempt) => attempt.student_id === studentId && attempt.course_id === courseId && attempt.lesson_id === lessonId)
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

  return attempts[0] ?? null;
}

function isAttemptPassed(attemptRecord) {
  if (!attemptRecord) return false;
  return Number(attemptRecord.total) > 0 && Number(attemptRecord.score) >= Number(attemptRecord.total);
}
