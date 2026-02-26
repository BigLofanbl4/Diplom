import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";

// GET endpoint: /api/v1/courses/:course_id/lessons/:lesson_id/test
export function getTestById(_req, res, params) {
  const courseId = Number(params.course_id);
  const lessonId = Number(params.lesson_id);

  const testRecord = findTest(courseId, lessonId);

  if (!testRecord) {
    return sendJson(res, 404, { detail: "Test not found" });
  }

  return sendJson(res, 200, serializeTest(testRecord));
}

// POST endpoint: /api/v1/courses/:course_id/lessons/:lesson_id/test
export async function createTest(req, res, params) {
  const courseId = Number(params.course_id);
  const lessonId = Number(params.lesson_id);

  // Предполагаяю что урок и курс существуют
  const payload = await parseBody(req);

  if (!isValidTestPayload(payload)) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const testId = nextId("tests");
  const testRecord = {
    id: testId,
    lesson_id: lessonId,
    course_id: courseId,
    title: payload.title,
    questions_number: Number(payload.questions_number),
  };
  insertQuestions(testId, payload.questions);
  db.tests.push(testRecord);

  return sendJson(res, 201, serializeTest(testRecord));
}

// PUT endpoint: /api/v1/courses/:course_id/lessons/:lesson_id/test
export async function updateTest(req, res, params) {
  const courseId = Number(params.course_id);
  const lessonId = Number(params.lesson_id);

  const payload = await parseBody(req);

  if (!isValidTestPayload(payload)) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const testRecord = findTest(courseId, lessonId);
  if (!testRecord) {
    return sendJson(res, 404, { detail: "Test not found" });
  }

  testRecord.title = payload.title;
  testRecord.questions_number = Number(payload.questions_number);
  clearTestQuestions(testRecord.id);
  insertQuestions(testRecord.id, payload.questions);

  return sendJson(res, 200, serializeTest(testRecord));
}

// DELETE endpoint: /api/v1/courses/:course_id/lessons/:lesson_id/test
export function deleteTest(_req, res, params) {
  const courseId = Number(params.course_id);
  const lessonId = Number(params.lesson_id);

  const testRecord = findTest(courseId, lessonId);
  if (!testRecord) {
    return sendJson(res, 404, { detail: "Test not found" });
  }
  db.tests = db.tests.filter(test => test.id !== testRecord.id);

  clearTestQuestions(testRecord.id);

  return sendNoContent(res, 204);
}

function serializeTest(testRecord) {
  const questions = db.questions.filter(questionRecord => questionRecord.test_id === testRecord.id);
  return {
    id: testRecord.id,
    questions: questions,
    questions_number: testRecord.questions_number,
    title: testRecord.title,
  };
}

function insertQuestions(testId, questions) {
  questions.forEach(question => {
    const questionId = nextId("questions");
    db.questions.push({
      id: questionId,
      test_id: testId,
      number: Number(question.number),
      text: question.text,
      type: question.type
    });
  });
}

function clearTestQuestions(testId) {
  db.questions = db.questions.filter(question => question.test_id !== testId);
}

function isValidTestPayload(payload) {
  return !(!payload.title || payload.questions.length === 0);
}

function findTest(courseId, lessonId) {
  return db.tests
    .find(testRecord => testRecord.lesson_id === lessonId && testRecord.course_id === courseId);
}