import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_API_PORT ?? 8000);
const API_PREFIX = "/api/v1";

const db = {
  admins: [{ id: 1, login: "admin", password: "admin123", organization_id: 1 }],
  teachers: [
    {
      id: 1,
      login: "teacher",
      password: "teacher123",
      phone: "+79990000001",
      first_name: "Иван",
      last_name: "Петров",
      age: 30,
      is_ovz: false,
      organization_id: 1,
    },
  ],
  students: [
    {
      id: 1,
      first_name: "Анна",
      last_name: "Смирнова",
      phone: "+79990000002",
      age: 13,
      birth_date: null,
    },
    {
      id: 2,
      first_name: "Дмитрий",
      last_name: "Ковалев",
      phone: "+79990000003",
      age: 14,
      birth_date: null,
    },
  ],
  groups: [{ id: 1, group_number: "101", course_id: 1, teacher_id: 1, student_ids: [1, 2] }],
  courses: [{ id: 1, title: "Математика", description: "Базовый курс математики" }],
  modules: [{ id: 1, title: "Алгебра", module_number: 1, course_id: 1 }],
  lessons: [
    {
      id: 1,
      title: "Линейные уравнения",
      lesson_number: 1,
      description: "Решение линейных уравнений",
      course_id: 1,
      module_id: 1,
    },
  ],
  materials: [
    {
      id: 1,
      homework_file: "homework-1.pdf",
      homework_text: null,
      course_id: 1,
      lesson_id: 1,
    },
  ],
  sessions: new Map(),
};

const counters = {
  teachers: 2,
  students: 3,
  groups: 2,
  courses: 2,
  modules: 2,
  lessons: 2,
  materials: 2,
};

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, data) {
  setCorsHeaders(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function sendNoContent(res) {
  setCorsHeaders(res);
  res.statusCode = 204;
  res.end();
}

function sendError(res, status, detail) {
  sendJson(res, status, { detail });
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function normalizeBracketKeys(data) {
  const normalized = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.endsWith("[]")) {
      normalized[key.slice(0, -2)] = ensureArray(value);
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

function parseKeyValues(params) {
  const raw = {};
  for (const [key, value] of params.entries()) {
    if (raw[key] === undefined) raw[key] = value;
    else if (Array.isArray(raw[key])) raw[key].push(value);
    else raw[key] = [raw[key], value];
  }
  return normalizeBracketKeys(raw);
}

function parseMultipart(contentType, bodyText) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return {};

  const boundary = (boundaryMatch[1] ?? boundaryMatch[2] ?? "").trim();
  if (!boundary) return {};

  const chunks = bodyText.split(`--${boundary}`);
  const parsed = {};

  for (const chunk of chunks) {
    if (!chunk || chunk === "--\r\n" || chunk === "--") continue;

    const trimmed = chunk.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const separatorIndex = trimmed.indexOf("\r\n\r\n");
    if (separatorIndex === -1) continue;

    const headersRaw = trimmed.slice(0, separatorIndex);
    let value = trimmed.slice(separatorIndex + 4).replace(/\r\n$/, "");

    const dispositionLine = headersRaw
      .split("\r\n")
      .find((line) => line.toLowerCase().startsWith("content-disposition"));
    if (!dispositionLine) continue;

    const nameMatch = dispositionLine.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;

    const filenameMatch = dispositionLine.match(/filename="([^"]*)"/i);
    const name = nameMatch[1];

    if (filenameMatch) {
      const filename = filenameMatch[1] ?? "";
      if (!filename) continue;

      if (!parsed[name]) parsed[name] = [];
      parsed[name].push({ filename });
      continue;
    }

    value = value.trim();
    if (parsed[name] === undefined) parsed[name] = value;
    else if (Array.isArray(parsed[name])) parsed[name].push(value);
    else parsed[name] = [parsed[name], value];
  }

  return normalizeBracketKeys(parsed);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  const raw = Buffer.concat(chunks);
  if (raw.length === 0) return {};

  const rawContentType = req.headers["content-type"] ?? "";
  const contentType = rawContentType.toLowerCase();
  const text = raw.toString("utf-8");

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return parseKeyValues(new URLSearchParams(text));
  }

  if (contentType.includes("multipart/form-data")) {
    return parseMultipart(rawContentType, text);
  }

  return {};
}

function paginate(list, searchParams) {
  const skip = toNumber(searchParams.get("skip")) ?? 0;
  const limit = toNumber(searchParams.get("limit")) ?? 100;
  return list.slice(skip, skip + limit);
}

function nextId(scope) {
  const id = counters[scope];
  counters[scope] += 1;
  return id;
}

function parseIdFromPath(path, pattern) {
  const match = path.match(pattern);
  if (!match) return null;
  return Number(match[1]);
}

function parseGroupIds(value) {
  return ensureArray(value)
    .map(toNumber)
    .filter((id) => id !== null);
}

function serializeStudent(student) {
  const groups = db.groups
    .filter((group) => group.student_ids.includes(student.id))
    .map((group) => ({ id: group.id, group_number: group.group_number }));

  return {
    id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    phone: student.phone,
    birth_date: student.birth_date ?? null,
    age: student.age ?? null,
    groups,
  };
}

function serializeTeacher(teacher) {
  const groups = db.groups
    .filter((group) => group.teacher_id === teacher.id)
    .map((group) => ({ id: group.id, group_number: group.group_number }));

  return {
    id: teacher.id,
    login: teacher.login,
    phone: teacher.phone,
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    age: teacher.age ?? null,
    is_ovz: Boolean(teacher.is_ovz),
    organization_id: teacher.organization_id ?? null,
    groups,
  };
}

function serializeGroup(group) {
  const teacher = db.teachers.find((item) => item.id === group.teacher_id);
  const students = db.students.filter((student) => group.student_ids.includes(student.id));

  return {
    id: group.id,
    group_number: String(group.group_number),
    course_id: group.course_id ?? null,
    teacher_id: group.teacher_id ?? null,
    teacher: teacher
      ? {
          id: teacher.id,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
        }
      : null,
    students: students.map((student) => ({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
    })),
  };
}

function serializeCourseList(course) {
  const modules = db.modules.filter((module) => module.course_id === course.id);
  const lessons = db.lessons.filter((lesson) => lesson.course_id === course.id);
  return { ...course, modules, lessons };
}

function serializeCourseDetail(course) {
  const modules = db.modules
    .filter((module) => module.course_id === course.id)
    .sort((a, b) => a.module_number - b.module_number);

  const lessons = db.lessons
    .filter((lesson) => lesson.course_id === course.id)
    .sort((a, b) => a.lesson_number - b.lesson_number);

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    modules,
    lessons,
  };
}

function serializeMaterial(material) {
  return {
    id: material.id,
    homework_file: material.homework_file,
    homework_text: material.homework_text ?? null,
    course_id: material.course_id,
    lesson_id: material.lesson_id,
    url: `${API_PREFIX}/course-materials/${material.id}`,
  };
}

function serializeLessonDetail(lesson) {
  const materials = db.materials
    .filter((material) => material.lesson_id === lesson.id)
    .map((material) => ({
      id: material.id,
      name: material.homework_file,
      size: null,
      lastModified: null,
      url: `${API_PREFIX}/course-materials/${material.id}`,
    }));

  return { ...lesson, materials };
}

function setTeacherGroups(teacherId, groupIds) {
  const allowedIds = new Set(groupIds);
  db.groups.forEach((group) => {
    if (allowedIds.has(group.id)) group.teacher_id = teacherId;
    else if (group.teacher_id === teacherId) group.teacher_id = null;
  });
}

function getAuthUser(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return db.sessions.get(token) ?? null;
}

function createContext(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return {
    req,
    method: req.method,
    path: url.pathname,
    searchParams: url.searchParams,
  };
}

function isRoute(ctx, method, path) {
  return ctx.method === method && ctx.path === path;
}

async function handleOrganization(ctx, res) {
  if (isRoute(ctx, "GET", `${API_PREFIX}/organization/`)) {
    sendJson(res, 200, { Hello: "World" });
    return true;
  }

  if (isRoute(ctx, "POST", `${API_PREFIX}/organization/register`)) {
    sendJson(res, 200, true);
    return true;
  }

  return false;
}

async function handleAuth(ctx, res) {
  if (isRoute(ctx, "POST", `${API_PREFIX}/auth/login`)) {
    const body = await parseBody(ctx.req);
    const username = body.username ?? body.login;
    const password = body.password;

    const admin = db.admins.find((item) => item.login === username && item.password === password);
    if (admin) {
      const token = `mock-admin-${randomUUID()}`;
      db.sessions.set(token, {
        id: admin.id,
        role: "admin",
        username: admin.login,
        organization_id: admin.organization_id,
      });
      sendJson(res, 200, { access_token: token, token_type: "bearer" });
      return true;
    }

    const teacher = db.teachers.find((item) => item.login === username && item.password === password);
    if (teacher) {
      const token = `mock-teacher-${randomUUID()}`;
      db.sessions.set(token, {
        id: teacher.id,
        role: "teacher",
        username: teacher.login,
        organization_id: teacher.organization_id ?? null,
      });
      sendJson(res, 200, { access_token: token, token_type: "bearer" });
      return true;
    }

    sendError(res, 401, "Incorrect username or password");
    return true;
  }

  if (isRoute(ctx, "GET", `${API_PREFIX}/auth/current_user`)) {
    const user = getAuthUser(ctx.req);
    if (!user) {
      sendError(res, 401, "invalid token error");
      return true;
    }

    sendJson(res, 200, {
      id: user.id,
      username: user.username,
      organization_id: user.organization_id,
      role: user.role,
    });
    return true;
  }

  return false;
}

async function handleTeachers(ctx, res) {
  if (isRoute(ctx, "GET", `${API_PREFIX}/teachers`)) {
    sendJson(res, 200, paginate(db.teachers, ctx.searchParams).map(serializeTeacher));
    return true;
  }

  if (isRoute(ctx, "POST", `${API_PREFIX}/teachers`)) {
    const body = await parseBody(ctx.req);
    if (!body.login || !body.password || !body.first_name || !body.last_name) {
      sendError(res, 400, "Missing required fields");
      return true;
    }

    const exists = db.teachers.find((item) => item.login === body.login);
    if (exists) {
      sendError(res, 400, "Login already registered");
      return true;
    }

    const teacher = {
      id: nextId("teachers"),
      login: body.login,
      password: body.password,
      phone: body.phone ?? null,
      first_name: body.first_name,
      last_name: body.last_name,
      age: toNumber(body.age),
      is_ovz: Boolean(body.is_ovz),
      organization_id: toNumber(body.organization_id),
    };

    db.teachers.push(teacher);
    setTeacherGroups(teacher.id, parseGroupIds(body.group_ids));
    sendJson(res, 200, serializeTeacher(teacher));
    return true;
  }

  const id = parseIdFromPath(ctx.path, new RegExp(`^${API_PREFIX}/teachers/(\\d+)$`));
  if (id === null) return false;

  const teacher = db.teachers.find((item) => item.id === id);
  if (!teacher) {
    sendError(res, 404, "Teacher not found");
    return true;
  }

  if (ctx.method === "GET") {
    sendJson(res, 200, serializeTeacher(teacher));
    return true;
  }

  if (ctx.method === "PATCH" || ctx.method === "PUT") {
    const body = await parseBody(ctx.req);
    if (body.login !== undefined) teacher.login = body.login;
    if (body.password) teacher.password = body.password;
    if (body.first_name !== undefined) teacher.first_name = body.first_name;
    if (body.last_name !== undefined) teacher.last_name = body.last_name;
    if (body.phone !== undefined) teacher.phone = body.phone;
    if (body.age !== undefined) teacher.age = toNumber(body.age);
    if (body.is_ovz !== undefined) teacher.is_ovz = Boolean(body.is_ovz);
    if (body.organization_id !== undefined) teacher.organization_id = toNumber(body.organization_id);
    if (body.group_ids !== undefined) setTeacherGroups(teacher.id, parseGroupIds(body.group_ids));

    sendJson(res, 200, serializeTeacher(teacher));
    return true;
  }

  if (ctx.method === "DELETE") {
    db.groups.forEach((group) => {
      if (group.teacher_id === teacher.id) group.teacher_id = null;
    });
    db.teachers.splice(db.teachers.indexOf(teacher), 1);
    sendNoContent(res);
    return true;
  }

  return false;
}

async function handleStudents(ctx, res) {
  if (isRoute(ctx, "GET", `${API_PREFIX}/students`)) {
    sendJson(res, 200, paginate(db.students, ctx.searchParams).map(serializeStudent));
    return true;
  }

  if (isRoute(ctx, "POST", `${API_PREFIX}/students`)) {
    const body = await parseBody(ctx.req);
    if (!body.first_name || !body.last_name) {
      sendError(res, 400, "Missing required fields");
      return true;
    }

    const student = {
      id: nextId("students"),
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone ?? null,
      age: toNumber(body.age),
      birth_date: body.birth_date ?? null,
    };

    db.students.push(student);
    const groupIds = parseGroupIds(body.group_ids);
    db.groups.forEach((group) => {
      group.student_ids = group.student_ids.filter((studentId) => studentId !== student.id);
      if (groupIds.includes(group.id)) group.student_ids.push(student.id);
    });

    sendJson(res, 200, serializeStudent(student));
    return true;
  }

  const id = parseIdFromPath(ctx.path, new RegExp(`^${API_PREFIX}/students/(\\d+)$`));
  if (id === null) return false;

  const student = db.students.find((item) => item.id === id);
  if (!student) {
    sendError(res, 404, "Student not found");
    return true;
  }

  if (ctx.method === "GET") {
    sendJson(res, 200, serializeStudent(student));
    return true;
  }

  if (ctx.method === "PATCH" || ctx.method === "PUT") {
    const body = await parseBody(ctx.req);
    if (body.first_name !== undefined) student.first_name = body.first_name;
    if (body.last_name !== undefined) student.last_name = body.last_name;
    if (body.phone !== undefined) student.phone = body.phone;
    if (body.age !== undefined) student.age = toNumber(body.age);
    if (body.birth_date !== undefined) student.birth_date = body.birth_date;

    if (body.group_ids !== undefined) {
      const groupIds = parseGroupIds(body.group_ids);
      db.groups.forEach((group) => {
        group.student_ids = group.student_ids.filter((studentId) => studentId !== student.id);
        if (groupIds.includes(group.id)) group.student_ids.push(student.id);
      });
    }

    sendJson(res, 200, serializeStudent(student));
    return true;
  }

  if (ctx.method === "DELETE") {
    db.groups.forEach((group) => {
      group.student_ids = group.student_ids.filter((studentId) => studentId !== student.id);
    });
    db.students.splice(db.students.indexOf(student), 1);
    sendNoContent(res);
    return true;
  }

  return false;
}

async function handleGroups(ctx, res) {
  if (isRoute(ctx, "GET", `${API_PREFIX}/groups`)) {
    sendJson(res, 200, paginate(db.groups, ctx.searchParams).map(serializeGroup));
    return true;
  }

  if (isRoute(ctx, "POST", `${API_PREFIX}/groups`)) {
    const body = await parseBody(ctx.req);
    if (body.group_number === undefined || body.group_number === null || body.group_number === "") {
      sendError(res, 400, "Missing required fields");
      return true;
    }

    const group = {
      id: nextId("groups"),
      group_number: String(body.group_number),
      course_id: toNumber(body.course_id),
      teacher_id: toNumber(body.teacher_id),
      student_ids: parseGroupIds(body.student_ids),
    };

    db.groups.push(group);
    sendJson(res, 200, serializeGroup(group));
    return true;
  }

  const id = parseIdFromPath(ctx.path, new RegExp(`^${API_PREFIX}/groups/(\\d+)$`));
  if (id === null) return false;

  const group = db.groups.find((item) => item.id === id);
  if (!group) {
    sendError(res, 404, "Group not found");
    return true;
  }

  if (ctx.method === "GET") {
    sendJson(res, 200, serializeGroup(group));
    return true;
  }

  if (ctx.method === "PATCH" || ctx.method === "PUT") {
    const body = await parseBody(ctx.req);
    if (body.group_number !== undefined) group.group_number = String(body.group_number);
    if (body.course_id !== undefined) group.course_id = toNumber(body.course_id);
    if (body.teacher_id !== undefined) group.teacher_id = toNumber(body.teacher_id);
    if (body.student_ids !== undefined) group.student_ids = parseGroupIds(body.student_ids);

    sendJson(res, 200, serializeGroup(group));
    return true;
  }

  if (ctx.method === "DELETE") {
    db.groups.splice(db.groups.indexOf(group), 1);
    sendNoContent(res);
    return true;
  }

  return false;
}

async function handleCourses(ctx, res) {
  if (isRoute(ctx, "GET", `${API_PREFIX}/courses`)) {
    sendJson(res, 200, paginate(db.courses, ctx.searchParams).map(serializeCourseList));
    return true;
  }

  if (isRoute(ctx, "POST", `${API_PREFIX}/courses`)) {
    const body = await parseBody(ctx.req);
    if (!body.title) {
      sendError(res, 400, "Missing required fields");
      return true;
    }

    const course = {
      id: nextId("courses"),
      title: body.title,
      description: body.description ?? "",
    };

    db.courses.push(course);
    sendJson(res, 200, course);
    return true;
  }

  const id = parseIdFromPath(ctx.path, new RegExp(`^${API_PREFIX}/courses/(\\d+)$`));
  if (id === null) return false;

  const course = db.courses.find((item) => item.id === id);
  if (!course) {
    sendError(res, 404, "Course not found");
    return true;
  }

  if (ctx.method === "GET") {
    sendJson(res, 200, serializeCourseDetail(course));
    return true;
  }

  if (ctx.method === "PATCH" || ctx.method === "PUT") {
    const body = await parseBody(ctx.req);
    if (body.title !== undefined) course.title = body.title;
    if (body.description !== undefined) course.description = body.description;

    sendJson(res, 200, course);
    return true;
  }

  if (ctx.method === "DELETE") {
    db.modules = db.modules.filter((module) => module.course_id !== course.id);
    const lessonIds = db.lessons.filter((lesson) => lesson.course_id === course.id).map((lesson) => lesson.id);
    db.lessons = db.lessons.filter((lesson) => lesson.course_id !== course.id);
    db.materials = db.materials.filter((material) => !lessonIds.includes(material.lesson_id));
    db.groups.forEach((group) => {
      if (group.course_id === course.id) group.course_id = null;
    });
    db.courses.splice(db.courses.indexOf(course), 1);

    sendNoContent(res);
    return true;
  }

  return false;
}

async function handleModules(ctx, res) {
  if (isRoute(ctx, "GET", `${API_PREFIX}/course-modules`)) {
    const courseId = toNumber(ctx.searchParams.get("course_id"));
    let modules = [...db.modules];
    if (courseId !== null) modules = modules.filter((item) => item.course_id === courseId);

    sendJson(res, 200, paginate(modules, ctx.searchParams));
    return true;
  }

  if (isRoute(ctx, "POST", `${API_PREFIX}/course-modules`)) {
    const body = await parseBody(ctx.req);
    if (!body.title || toNumber(body.module_number) === null || toNumber(body.course_id) === null) {
      sendError(res, 400, "Missing required fields");
      return true;
    }

    const module = {
      id: nextId("modules"),
      title: body.title,
      module_number: toNumber(body.module_number),
      course_id: toNumber(body.course_id),
    };

    db.modules.push(module);
    sendJson(res, 200, module);
    return true;
  }

  const id = parseIdFromPath(ctx.path, new RegExp(`^${API_PREFIX}/course-modules/(\\d+)$`));
  if (id === null) return false;

  const module = db.modules.find((item) => item.id === id);
  if (!module) {
    sendError(res, 404, "Course module not found");
    return true;
  }

  if (ctx.method === "GET") {
    sendJson(res, 200, module);
    return true;
  }

  if (ctx.method === "PATCH" || ctx.method === "PUT") {
    const body = await parseBody(ctx.req);
    if (body.title !== undefined) module.title = body.title;
    if (body.module_number !== undefined) module.module_number = toNumber(body.module_number);
    if (body.course_id !== undefined) module.course_id = toNumber(body.course_id);

    sendJson(res, 200, module);
    return true;
  }

  if (ctx.method === "DELETE") {
    const lessonIds = db.lessons.filter((lesson) => lesson.module_id === module.id).map((lesson) => lesson.id);
    db.lessons = db.lessons.filter((lesson) => lesson.module_id !== module.id);
    db.materials = db.materials.filter((material) => !lessonIds.includes(material.lesson_id));
    db.modules.splice(db.modules.indexOf(module), 1);

    sendNoContent(res);
    return true;
  }

  return false;
}

async function handleLessons(ctx, res) {
  if (isRoute(ctx, "GET", `${API_PREFIX}/course-lessons`)) {
    const courseId = toNumber(ctx.searchParams.get("course_id"));
    const moduleId = toNumber(ctx.searchParams.get("module_id"));

    let lessons = [...db.lessons];
    if (courseId !== null) lessons = lessons.filter((item) => item.course_id === courseId);
    if (moduleId !== null) lessons = lessons.filter((item) => item.module_id === moduleId);

    sendJson(res, 200, paginate(lessons, ctx.searchParams));
    return true;
  }

  if (isRoute(ctx, "POST", `${API_PREFIX}/course-lessons`)) {
    const body = await parseBody(ctx.req);
    if (!body.title || toNumber(body.lesson_number) === null || toNumber(body.course_id) === null) {
      sendError(res, 400, "Missing required fields");
      return true;
    }

    const lesson = {
      id: nextId("lessons"),
      title: body.title,
      lesson_number: toNumber(body.lesson_number),
      description: body.description ?? "",
      course_id: toNumber(body.course_id),
      module_id: toNumber(body.module_id),
    };

    db.lessons.push(lesson);

    ensureArray(body.materials).forEach((file) => {
      if (!file?.filename) return;
      db.materials.push({
        id: nextId("materials"),
        homework_file: file.filename,
        homework_text: null,
        course_id: lesson.course_id,
        lesson_id: lesson.id,
      });
    });

    sendJson(res, 200, serializeLessonDetail(lesson));
    return true;
  }

  const id = parseIdFromPath(ctx.path, new RegExp(`^${API_PREFIX}/course-lessons/(\\d+)$`));
  if (id === null) return false;

  const lesson = db.lessons.find((item) => item.id === id);
  if (!lesson) {
    sendError(res, 404, "Course lesson not found");
    return true;
  }

  if (ctx.method === "GET") {
    sendJson(res, 200, serializeLessonDetail(lesson));
    return true;
  }

  if (ctx.method === "PATCH" || ctx.method === "PUT") {
    const body = await parseBody(ctx.req);

    if (body.title !== undefined) lesson.title = body.title;
    if (body.lesson_number !== undefined) lesson.lesson_number = toNumber(body.lesson_number);
    if (body.description !== undefined) lesson.description = body.description;
    if (body.course_id !== undefined) lesson.course_id = toNumber(body.course_id);
    if (body.module_id !== undefined) lesson.module_id = toNumber(body.module_id);

    const removedIds = ensureArray(body.removed_material_ids)
      .map(toNumber)
      .filter((materialId) => materialId !== null);

    if (removedIds.length > 0) {
      db.materials = db.materials.filter(
        (material) => !(material.lesson_id === lesson.id && removedIds.includes(material.id))
      );
    }

    ensureArray(body.materials).forEach((file) => {
      if (!file?.filename) return;
      db.materials.push({
        id: nextId("materials"),
        homework_file: file.filename,
        homework_text: null,
        course_id: lesson.course_id,
        lesson_id: lesson.id,
      });
    });

    sendJson(res, 200, serializeLessonDetail(lesson));
    return true;
  }

  if (ctx.method === "DELETE") {
    db.materials = db.materials.filter((material) => material.lesson_id !== lesson.id);
    db.lessons.splice(db.lessons.indexOf(lesson), 1);

    sendNoContent(res);
    return true;
  }

  return false;
}

async function handleMaterials(ctx, res) {
  if (isRoute(ctx, "GET", `${API_PREFIX}/course-materials`)) {
    const courseId = toNumber(ctx.searchParams.get("course_id"));
    const lessonId = toNumber(ctx.searchParams.get("lesson_id"));

    let materials = [...db.materials];
    if (courseId !== null) materials = materials.filter((item) => item.course_id === courseId);
    if (lessonId !== null) materials = materials.filter((item) => item.lesson_id === lessonId);

    sendJson(res, 200, paginate(materials, ctx.searchParams).map(serializeMaterial));
    return true;
  }

  if (isRoute(ctx, "POST", `${API_PREFIX}/course-materials`)) {
    const body = await parseBody(ctx.req);
    if (toNumber(body.course_id) === null || toNumber(body.lesson_id) === null) {
      sendError(res, 400, "Missing required fields");
      return true;
    }

    const material = {
      id: nextId("materials"),
      homework_file: body.homework_file ?? "material.txt",
      homework_text: body.homework_text ?? null,
      course_id: toNumber(body.course_id),
      lesson_id: toNumber(body.lesson_id),
    };

    db.materials.push(material);
    sendJson(res, 200, serializeMaterial(material));
    return true;
  }

  const id = parseIdFromPath(ctx.path, new RegExp(`^${API_PREFIX}/course-materials/(\\d+)$`));
  if (id === null) return false;

  const material = db.materials.find((item) => item.id === id);
  if (!material) {
    sendError(res, 404, "Course material not found");
    return true;
  }

  if (ctx.method === "GET") {
    sendJson(res, 200, serializeMaterial(material));
    return true;
  }

  if (ctx.method === "PATCH" || ctx.method === "PUT") {
    const body = await parseBody(ctx.req);
    if (body.homework_file !== undefined) material.homework_file = body.homework_file;
    if (body.homework_text !== undefined) material.homework_text = body.homework_text;
    if (body.course_id !== undefined) material.course_id = toNumber(body.course_id);
    if (body.lesson_id !== undefined) material.lesson_id = toNumber(body.lesson_id);

    sendJson(res, 200, serializeMaterial(material));
    return true;
  }

  if (ctx.method === "DELETE") {
    db.materials.splice(db.materials.indexOf(material), 1);
    sendNoContent(res);
    return true;
  }

  return false;
}

const handlers = [
  handleOrganization,
  handleAuth,
  handleTeachers,
  handleStudents,
  handleGroups,
  handleCourses,
  handleModules,
  handleLessons,
  handleMaterials,
];

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const ctx = createContext(req);

  for (const handler of handlers) {
    const handled = await handler(ctx, res);
    if (handled) return;
  }

  sendError(res, 404, "Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock API is running on http://127.0.0.1:${PORT}${API_PREFIX}`);
  console.log("Demo credentials: admin/admin123, teacher/teacher123");
});
