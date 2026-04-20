import { db, nextId } from "../db.js";
import { parseBody, parseMultipartBody, sendJson } from "../utils/http.js";
import { ensureCourseInstance } from "../utils/courseTemplates.js";
import { serializeCourse, serializeCourseDetails } from "../utils/serializers.js";
import { requireAuth } from "./auth.js";

export function getMyCourses(req, res) {
  const studentContext = getStudentContext(req, res);
  if (!studentContext) return;

  const groups = getStudentGroups(studentContext.student.id);
  const courses = groups
    .map((group) => {
      const course = group.course_id ? ensureCourseInstance(group) : null;
      if (!course) return null;
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        group: {
          id: group.id,
          group_number: group.group_number,
        },
        modules_count: db.modules.filter((module) => module.course_id === course.id).length,
        lessons_count: db.lessons.filter((lesson) => lesson.course_id === course.id).length,
      };
    })
    .filter(Boolean);

  return sendJson(res, 200, { data: courses });
}

export function getMyCourseById(req, res, params) {
  const studentContext = getStudentContext(req, res);
  if (!studentContext) return;

  const courseId = Number(params.courseId);
  const courseRecord = getStudentCourse(studentContext.student.id, courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const baseDetails = serializeCourseDetails(courseRecord);
  const lessons = baseDetails.lessons.map((lesson) => ({
    ...lesson,
    homework_submission: getLatestHomeworkSubmission(studentContext.student.id, courseRecord.id, lesson.id),
    latest_test_attempt: getLatestTestAttempt(studentContext.student.id, courseRecord.id, lesson.id),
  }));

  return sendJson(res, 200, {
    ...baseDetails,
    lessons,
  });
}

export function getMyLessonTest(req, res, params) {
  const studentContext = getStudentContext(req, res);
  if (!studentContext) return;

  const courseId = Number(params.courseId);
  const lessonId = Number(params.lessonId);
  const courseRecord = getStudentCourse(studentContext.student.id, courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const testRecord = db.tests.find((test) => test.course_id === courseId && test.lesson_id === lessonId);
  if (!testRecord) {
    return sendJson(res, 404, { detail: "Test not found" });
  }

  const questions = db.questions.filter((question) => question.test_id === testRecord.id);
  return sendJson(res, 200, {
    id: testRecord.id,
    title: testRecord.title,
    lesson_id: lessonId,
    course_id: courseId,
    questions,
    latest_attempt: getLatestTestAttempt(studentContext.student.id, courseId, lessonId),
  });
}

export async function submitMyLessonTest(req, res, params) {
  const studentContext = getStudentContext(req, res);
  if (!studentContext) return;

  const courseId = Number(params.courseId);
  const lessonId = Number(params.lessonId);
  const courseRecord = getStudentCourse(studentContext.student.id, courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const testRecord = db.tests.find((test) => test.course_id === courseId && test.lesson_id === lessonId);
  if (!testRecord) {
    return sendJson(res, 404, { detail: "Test not found" });
  }

  const payload = await parseBody(req);
  const rawAnswers = payload.answers ?? {};
  const questions = db.questions.filter((question) => question.test_id === testRecord.id);

  const answers = questions.map((question) => {
    const rawValue = rawAnswers[String(question.id)] ?? rawAnswers[question.id] ?? [];
    const normalizedValue = normalizeAnswer(rawValue);
    const correctAnswer = normalizeAnswer(question.answer);
    const isCorrect = compareAnswers(question.type, normalizedValue, correctAnswer);

    return {
      question_id: question.id,
      value: normalizedValue,
      is_correct: isCorrect,
    };
  });

  const score = answers.filter((answer) => answer.is_correct).length;

  const attempt = {
    id: nextId("testAttempts"),
    student_id: studentContext.student.id,
    lesson_id: lessonId,
    course_id: courseId,
    test_id: testRecord.id,
    score,
    total: questions.length,
    answers,
    created_at: new Date().toISOString(),
  };

  db.test_attempts.push(attempt);

  return sendJson(res, 201, attempt);
}

export async function submitMyHomework(req, res, params) {
  const studentContext = getStudentContext(req, res);
  if (!studentContext) return;

  const courseId = Number(params.courseId);
  const lessonId = Number(params.lessonId);
  const courseRecord = getStudentCourse(studentContext.student.id, courseId);
  if (!courseRecord) {
    return sendJson(res, 404, { detail: "Course not found" });
  }

  const lessonRecord = db.lessons.find((lesson) => lesson.course_id === courseId && lesson.id === lessonId);
  if (!lessonRecord) {
    return sendJson(res, 404, { detail: "Lesson not found" });
  }

  const { fields, files } = await parseMultipartBody(req);
  const submissionFiles = (files.files ?? []).map((file) => {
    const fileId = nextId("submissionFiles");
    return {
      id: fileId,
      name: file.name,
      size: file.size,
      url: `/submission/${fileId}`,
    };
  });

  const existing = db.homework_submissions.find(
    (submission) => (
      submission.student_id === studentContext.student.id &&
      submission.course_id === courseId &&
      submission.lesson_id === lessonId
    )
  );

  if (existing) {
    existing.text = fields.text ?? "";
    existing.files = submissionFiles;
    existing.created_at = new Date().toISOString();
    existing.status = "pending";
    existing.feedback = "";
    existing.checked_at = null;
    existing.checked_by = null;
    return sendJson(res, 200, existing);
  }

  const submission = {
    id: nextId("homeworkSubmissions"),
    student_id: studentContext.student.id,
    lesson_id: lessonId,
    course_id: courseId,
    text: fields.text ?? "",
    status: "pending",
    feedback: "",
    checked_at: null,
    checked_by: null,
    files: submissionFiles,
    created_at: new Date().toISOString(),
  };

  db.homework_submissions.push(submission);

  return sendJson(res, 201, submission);
}

function getStudentContext(req, res) {
  const authContext = requireAuth(req, res);
  if (!authContext) return null;

  const user = db.users.find((userRecord) => userRecord.id === authContext.userId);
  if (!user || user.role !== "student") {
    sendJson(res, 403, { detail: "Student access required" });
    return null;
  }

  const student = db.students.find((studentRecord) => studentRecord.user_id === user.id);
  if (!student) {
    sendJson(res, 404, { detail: "Student profile not found" });
    return null;
  }

  return { user, student };
}

function getStudentGroups(studentId) {
  return db.groups.filter((group) => group.student_ids.includes(studentId));
}

function getStudentCourse(studentId, courseId) {
  const groups = getStudentGroups(studentId);
  for (const group of groups) {
    const ensuredCourse = group.course_id ? ensureCourseInstance(group) : null;
    if (ensuredCourse?.id === courseId) {
      return ensuredCourse;
    }
  }
  return null;
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

function normalizeAnswer(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toLowerCase()).sort();
  }
  if (value === null || value === undefined) return [];
  return [String(value).trim().toLowerCase()];
}

function compareAnswers(type, actual, expected) {
  if (type === "multiple_choice") {
    return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
  }

  return actual[0] === expected[0];
}
