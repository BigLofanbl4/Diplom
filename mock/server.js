import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_API_PORT ?? 8000);
const API_PREFIX = "/api/v1";

const db = {
  admins: [
    { id: 1, login: "admin", password: "admin123", organization_id: 1 },
  ],
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
  groups: [
    { id: 1, group_number: "101", course_id: 1, teacher_id: 1, student_ids: [1, 2] },
  ],
  courses: [
    { id: 1, title: "Математика", description: "Базовый курс математики" },
  ],
  modules: [
    { id: 1, title: "Алгебра", module_number: 1, course_id: 1 },
  ],
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

function parseKeyValues(params) {
  const raw = {};
  for (const [key, value] of params.entries()) {
    if (raw[key] === undefined) {
      raw[key] = value;
    } else if (Array.isArray(raw[key])) {
      raw[key].push(value);
    } else {
      raw[key] = [raw[key], value];
    }
  }
  return normalizeBracketKeys(raw);
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

function parseMultipart(contentType, bodyText) {
  const boundaryMatch = contentType.match(/boundary=(.+)$/i);
  if (!boundaryMatch) return {};
  const boundary = boundaryMatch[1];
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

    if (filenameMatch && filenameMatch[1]) {
      const fileName = filenameMatch[1];
      const entry = { filename: fileName };
      if (!parsed[name]) parsed[name] = [];
      parsed[name].push(entry);
      continue;
    }

    value = value.trim();
    if (parsed[name] === undefined) {
      parsed[name] = value;
    } else if (Array.isArray(parsed[name])) {
      parsed[name].push(value);
    } else {
      parsed[name] = [parsed[name], value];
    }
  }

  return normalizeBracketKeys(parsed);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks);
  if (raw.length === 0) return {};

  const contentType = (req.headers["content-type"] ?? "").toLowerCase();
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
    return parseMultipart(contentType, text);
  }

  return {};
}

function paginate(list, searchParams) {
  const skip = toNumber(searchParams.get("skip")) ?? 0;
  const limit = toNumber(searchParams.get("limit")) ?? 100;
  return list.slice(skip, skip + limit);
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

  return {
    ...lesson,
    materials,
  };
}

function setTeacherGroups(teacherId, groupIds) {
  const allowed = new Set(groupIds);
  db.groups.forEach((group) => {
    if (allowed.has(group.id)) {
      group.teacher_id = teacherId;
    } else if (group.teacher_id === teacherId) {
      group.teacher_id = null;
    }
  });
}

function nextId(scope) {
  const id = counters[scope];
  counters[scope] += 1;
  return id;
}

function getAuthUser(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return db.sessions.get(token) ?? null;
}

function parseGroupIds(value) {
  return ensureArray(value)
    .map(toNumber)
    .filter((id) => id !== null);
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  if (path === `${API_PREFIX}/organization/` && method === "GET") {
    return sendJson(res, 200, { Hello: "World" });
  }

  if (path === `${API_PREFIX}/organization/register` && method === "POST") {
    return sendJson(res, 200, true);
  }

  if (path === `${API_PREFIX}/auth/login` && method === "POST") {
    const body = await parseBody(req);
    const username = body.username ?? body.login;
    const password = body.password;

    const admin = db.admins.find((item) => item.login === username && item.password === password);
    if (admin) {
      const token = `mock-admin-${randomUUID()}`;
      db.sessions.set(token, { id: admin.id, role: "admin", username: admin.login, organization_id: admin.organization_id });
      return sendJson(res, 200, { access_token: token, token_type: "bearer" });
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
      return sendJson(res, 200, { access_token: token, token_type: "bearer" });
    }

    return sendError(res, 401, "Incorrect username or password");
  }

  if (path === `${API_PREFIX}/auth/current_user` && method === "GET") {
    const user = getAuthUser(req);
    if (!user) return sendError(res, 401, "invalid token error");
    return sendJson(res, 200, {
      id: user.id,
      username: user.username,
      organization_id: user.organization_id,
      role: user.role,
    });
  }

  if (path === `${API_PREFIX}/teachers` && method === "GET") {
    return sendJson(res, 200, paginate(db.teachers, url.searchParams).map(serializeTeacher));
  }

  if (path === `${API_PREFIX}/teachers` && method === "POST") {
    const body = await parseBody(req);
    if (!body.login || !body.password || !body.first_name || !body.last_name) {
      return sendError(res, 400, "Missing required fields");
    }

    const exists = db.teachers.find((item) => item.login === body.login);
    if (exists) return sendError(res, 400, "Login already registered");

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
    return sendJson(res, 200, serializeTeacher(teacher));
  }

  const teacherMatch = path.match(new RegExp(`^${API_PREFIX}/teachers/(\\d+)$`));
  if (teacherMatch) {
    const teacherId = Number(teacherMatch[1]);
    const teacher = db.teachers.find((item) => item.id === teacherId);
    if (!teacher) return sendError(res, 404, "Teacher not found");

    if (method === "GET") return sendJson(res, 200, serializeTeacher(teacher));

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(req);
      if (body.login !== undefined) teacher.login = body.login;
      if (body.password) teacher.password = body.password;
      if (body.first_name !== undefined) teacher.first_name = body.first_name;
      if (body.last_name !== undefined) teacher.last_name = body.last_name;
      if (body.phone !== undefined) teacher.phone = body.phone;
      if (body.age !== undefined) teacher.age = toNumber(body.age);
      if (body.is_ovz !== undefined) teacher.is_ovz = Boolean(body.is_ovz);
      if (body.organization_id !== undefined) teacher.organization_id = toNumber(body.organization_id);
      if (body.group_ids !== undefined) setTeacherGroups(teacher.id, parseGroupIds(body.group_ids));
      return sendJson(res, 200, serializeTeacher(teacher));
    }

    if (method === "DELETE") {
      db.groups.forEach((group) => {
        if (group.teacher_id === teacher.id) group.teacher_id = null;
      });
      db.teachers.splice(db.teachers.indexOf(teacher), 1);
      return sendNoContent(res);
    }
  }

  if (path === `${API_PREFIX}/students` && method === "GET") {
    return sendJson(res, 200, paginate(db.students, url.searchParams).map(serializeStudent));
  }

  if (path === `${API_PREFIX}/students` && method === "POST") {
    const body = await parseBody(req);
    if (!body.first_name || !body.last_name) return sendError(res, 400, "Missing required fields");
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
      group.student_ids = group.student_ids.filter((id) => id !== student.id);
      if (groupIds.includes(group.id)) group.student_ids.push(student.id);
    });
    return sendJson(res, 200, serializeStudent(student));
  }

  const studentMatch = path.match(new RegExp(`^${API_PREFIX}/students/(\\d+)$`));
  if (studentMatch) {
    const studentId = Number(studentMatch[1]);
    const student = db.students.find((item) => item.id === studentId);
    if (!student) return sendError(res, 404, "Student not found");

    if (method === "GET") return sendJson(res, 200, serializeStudent(student));

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(req);
      if (body.first_name !== undefined) student.first_name = body.first_name;
      if (body.last_name !== undefined) student.last_name = body.last_name;
      if (body.phone !== undefined) student.phone = body.phone;
      if (body.age !== undefined) student.age = toNumber(body.age);
      if (body.birth_date !== undefined) student.birth_date = body.birth_date;

      if (body.group_ids !== undefined) {
        const groupIds = parseGroupIds(body.group_ids);
        db.groups.forEach((group) => {
          group.student_ids = group.student_ids.filter((id) => id !== student.id);
          if (groupIds.includes(group.id)) group.student_ids.push(student.id);
        });
      }
      return sendJson(res, 200, serializeStudent(student));
    }

    if (method === "DELETE") {
      db.groups.forEach((group) => {
        group.student_ids = group.student_ids.filter((id) => id !== student.id);
      });
      db.students.splice(db.students.indexOf(student), 1);
      return sendNoContent(res);
    }
  }

  if (path === `${API_PREFIX}/groups` && method === "GET") {
    return sendJson(res, 200, paginate(db.groups, url.searchParams).map(serializeGroup));
  }

  if (path === `${API_PREFIX}/groups` && method === "POST") {
    const body = await parseBody(req);
    if (body.group_number === undefined || body.group_number === null || body.group_number === "") {
      return sendError(res, 400, "Missing required fields");
    }

    const group = {
      id: nextId("groups"),
      group_number: String(body.group_number),
      course_id: toNumber(body.course_id),
      teacher_id: toNumber(body.teacher_id),
      student_ids: parseGroupIds(body.student_ids),
    };
    db.groups.push(group);
    return sendJson(res, 200, serializeGroup(group));
  }

  const groupMatch = path.match(new RegExp(`^${API_PREFIX}/groups/(\\d+)$`));
  if (groupMatch) {
    const groupId = Number(groupMatch[1]);
    const group = db.groups.find((item) => item.id === groupId);
    if (!group) return sendError(res, 404, "Group not found");

    if (method === "GET") return sendJson(res, 200, serializeGroup(group));

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(req);
      if (body.group_number !== undefined) group.group_number = String(body.group_number);
      if (body.course_id !== undefined) group.course_id = toNumber(body.course_id);
      if (body.teacher_id !== undefined) group.teacher_id = toNumber(body.teacher_id);
      if (body.student_ids !== undefined) group.student_ids = parseGroupIds(body.student_ids);
      return sendJson(res, 200, serializeGroup(group));
    }

    if (method === "DELETE") {
      db.groups.splice(db.groups.indexOf(group), 1);
      return sendNoContent(res);
    }
  }

  if (path === `${API_PREFIX}/courses` && method === "GET") {
    return sendJson(res, 200, paginate(db.courses, url.searchParams).map(serializeCourseList));
  }

  if (path === `${API_PREFIX}/courses` && method === "POST") {
    const body = await parseBody(req);
    if (!body.title) return sendError(res, 400, "Missing required fields");
    const course = {
      id: nextId("courses"),
      title: body.title,
      description: body.description ?? "",
    };
    db.courses.push(course);
    return sendJson(res, 200, course);
  }

  const courseMatch = path.match(new RegExp(`^${API_PREFIX}/courses/(\\d+)$`));
  if (courseMatch) {
    const courseId = Number(courseMatch[1]);
    const course = db.courses.find((item) => item.id === courseId);
    if (!course) return sendError(res, 404, "Course not found");

    if (method === "GET") return sendJson(res, 200, serializeCourseDetail(course));

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(req);
      if (body.title !== undefined) course.title = body.title;
      if (body.description !== undefined) course.description = body.description;
      return sendJson(res, 200, course);
    }

    if (method === "DELETE") {
      db.modules = db.modules.filter((module) => module.course_id !== course.id);
      const lessonIds = db.lessons.filter((lesson) => lesson.course_id === course.id).map((lesson) => lesson.id);
      db.lessons = db.lessons.filter((lesson) => lesson.course_id !== course.id);
      db.materials = db.materials.filter((material) => !lessonIds.includes(material.lesson_id));
      db.groups.forEach((group) => {
        if (group.course_id === course.id) group.course_id = null;
      });
      db.courses.splice(db.courses.indexOf(course), 1);
      return sendNoContent(res);
    }
  }

  if (path === `${API_PREFIX}/course-modules` && method === "GET") {
    const courseId = toNumber(url.searchParams.get("course_id"));
    let modules = [...db.modules];
    if (courseId !== null) modules = modules.filter((item) => item.course_id === courseId);
    return sendJson(res, 200, paginate(modules, url.searchParams));
  }

  if (path === `${API_PREFIX}/course-modules` && method === "POST") {
    const body = await parseBody(req);
    if (!body.title || toNumber(body.module_number) === null || toNumber(body.course_id) === null) {
      return sendError(res, 400, "Missing required fields");
    }

    const module = {
      id: nextId("modules"),
      title: body.title,
      module_number: toNumber(body.module_number),
      course_id: toNumber(body.course_id),
    };
    db.modules.push(module);
    return sendJson(res, 200, module);
  }

  const moduleMatch = path.match(new RegExp(`^${API_PREFIX}/course-modules/(\\d+)$`));
  if (moduleMatch) {
    const moduleId = Number(moduleMatch[1]);
    const module = db.modules.find((item) => item.id === moduleId);
    if (!module) return sendError(res, 404, "Course module not found");

    if (method === "GET") return sendJson(res, 200, module);

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(req);
      if (body.title !== undefined) module.title = body.title;
      if (body.module_number !== undefined) module.module_number = toNumber(body.module_number);
      if (body.course_id !== undefined) module.course_id = toNumber(body.course_id);
      return sendJson(res, 200, module);
    }

    if (method === "DELETE") {
      const lessonIds = db.lessons.filter((lesson) => lesson.module_id === module.id).map((lesson) => lesson.id);
      db.lessons = db.lessons.filter((lesson) => lesson.module_id !== module.id);
      db.materials = db.materials.filter((material) => !lessonIds.includes(material.lesson_id));
      db.modules.splice(db.modules.indexOf(module), 1);
      return sendNoContent(res);
    }
  }

  if (path === `${API_PREFIX}/course-lessons` && method === "GET") {
    const courseId = toNumber(url.searchParams.get("course_id"));
    const moduleId = toNumber(url.searchParams.get("module_id"));
    let lessons = [...db.lessons];
    if (courseId !== null) lessons = lessons.filter((item) => item.course_id === courseId);
    if (moduleId !== null) lessons = lessons.filter((item) => item.module_id === moduleId);
    return sendJson(res, 200, paginate(lessons, url.searchParams));
  }

  if (path === `${API_PREFIX}/course-lessons` && method === "POST") {
    const body = await parseBody(req);
    if (!body.title || toNumber(body.lesson_number) === null || toNumber(body.course_id) === null) {
      return sendError(res, 400, "Missing required fields");
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

    return sendJson(res, 200, serializeLessonDetail(lesson));
  }

  const lessonMatch = path.match(new RegExp(`^${API_PREFIX}/course-lessons/(\\d+)$`));
  if (lessonMatch) {
    const lessonId = Number(lessonMatch[1]);
    const lesson = db.lessons.find((item) => item.id === lessonId);
    if (!lesson) return sendError(res, 404, "Course lesson not found");

    if (method === "GET") return sendJson(res, 200, serializeLessonDetail(lesson));

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(req);
      if (body.title !== undefined) lesson.title = body.title;
      if (body.lesson_number !== undefined) lesson.lesson_number = toNumber(body.lesson_number);
      if (body.description !== undefined) lesson.description = body.description;
      if (body.course_id !== undefined) lesson.course_id = toNumber(body.course_id);
      if (body.module_id !== undefined) lesson.module_id = toNumber(body.module_id);

      const removedIds = ensureArray(body.removed_material_ids)
        .map(toNumber)
        .filter((id) => id !== null);
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

      return sendJson(res, 200, serializeLessonDetail(lesson));
    }

    if (method === "DELETE") {
      db.materials = db.materials.filter((material) => material.lesson_id !== lesson.id);
      db.lessons.splice(db.lessons.indexOf(lesson), 1);
      return sendNoContent(res);
    }
  }

  if (path === `${API_PREFIX}/course-materials` && method === "GET") {
    const courseId = toNumber(url.searchParams.get("course_id"));
    const lessonId = toNumber(url.searchParams.get("lesson_id"));
    let materials = [...db.materials];
    if (courseId !== null) materials = materials.filter((item) => item.course_id === courseId);
    if (lessonId !== null) materials = materials.filter((item) => item.lesson_id === lessonId);
    return sendJson(res, 200, paginate(materials, url.searchParams).map(serializeMaterial));
  }

  if (path === `${API_PREFIX}/course-materials` && method === "POST") {
    const body = await parseBody(req);
    if (toNumber(body.course_id) === null || toNumber(body.lesson_id) === null) {
      return sendError(res, 400, "Missing required fields");
    }
    const material = {
      id: nextId("materials"),
      homework_file: body.homework_file ?? "material.txt",
      homework_text: body.homework_text ?? null,
      course_id: toNumber(body.course_id),
      lesson_id: toNumber(body.lesson_id),
    };
    db.materials.push(material);
    return sendJson(res, 200, serializeMaterial(material));
  }

  const materialMatch = path.match(new RegExp(`^${API_PREFIX}/course-materials/(\\d+)$`));
  if (materialMatch) {
    const materialId = Number(materialMatch[1]);
    const material = db.materials.find((item) => item.id === materialId);
    if (!material) return sendError(res, 404, "Course material not found");

    if (method === "GET") return sendJson(res, 200, serializeMaterial(material));

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(req);
      if (body.homework_file !== undefined) material.homework_file = body.homework_file;
      if (body.homework_text !== undefined) material.homework_text = body.homework_text;
      if (body.course_id !== undefined) material.course_id = toNumber(body.course_id);
      if (body.lesson_id !== undefined) material.lesson_id = toNumber(body.lesson_id);
      return sendJson(res, 200, serializeMaterial(material));
    }

    if (method === "DELETE") {
      db.materials.splice(db.materials.indexOf(material), 1);
      return sendNoContent(res);
    }
  }

  return sendError(res, 404, "Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock API is running on http://127.0.0.1:${PORT}${API_PREFIX}`);
  console.log("Demo credentials: admin/admin123, teacher/teacher123");
});
