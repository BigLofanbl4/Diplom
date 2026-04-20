import { API_PREFIX } from "./config.js";
import {
  createTeacher,
  deleteTeacher,
  getTeacherById,
  getTeachers,
  updateTeacher,
} from "./handlers/teachers.js";
import {
  getMyGroupById,
  getMyGroups,
  getMyPreferences,
  updateMyPreferences,
} from "./handlers/teacherPortal.js";
import {
  createStudent,
  deleteStudent,
  getStudentById,
  getStudents,
  updateStudent,
} from "./handlers/students.js";
import {
  createGroup,
  deleteGroup,
  getGroupById,
  getGroups,
  updateGroup,
} from "./handlers/groups.js";
import {
  createCourse,
  deleteCourse,
  getCourseById,
  getCourses,
  updateCourse,
} from "./handlers/courses.js";
import {
  createModule,
  deleteModule,
  getModuleById,
  getModules,
  updateModule,
} from "./handlers/modules.js";
import {
  createLesson,
  deleteLesson,
  getLessonById,
  getLessons,
  updateLesson,
} from "./handlers/lessons.js";
import {
  createTest,
  deleteTest,
  getTestById,
  updateTest,
} from "./handlers/tests.js";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshToken,
} from "./handlers/auth.js";

export const routes = [
  { method: "POST", path: `${API_PREFIX}/auth/login`, handler: loginUser },
  { method: "POST", path: `${API_PREFIX}/auth/refresh`, handler: refreshToken },
  { method: "GET", path: `${API_PREFIX}/auth/current_user`, handler: getCurrentUser },
  { method: "POST", path: `${API_PREFIX}/auth/logout`, handler: logoutUser },
  { method: "GET", path: `${API_PREFIX}/teachers/me/groups`, handler: getMyGroups },
  { method: "GET", path: `${API_PREFIX}/teachers/me/groups/:groupId`, handler: getMyGroupById },
  { method: "GET", path: `${API_PREFIX}/teachers/me/preferences`, handler: getMyPreferences },
  { method: "PUT", path: `${API_PREFIX}/teachers/me/preferences`, handler: updateMyPreferences },
  { method: "GET", path: `${API_PREFIX}/teachers`, handler: getTeachers },
  { method: "GET", path: `${API_PREFIX}/teachers/:id`, handler: getTeacherById },
  { method: "POST", path: `${API_PREFIX}/teachers`, handler: createTeacher },
  { method: "PATCH", path: `${API_PREFIX}/teachers/:id`, handler: updateTeacher },
  { method: "DELETE", path: `${API_PREFIX}/teachers/:id`, handler: deleteTeacher },
  { method: "GET", path: `${API_PREFIX}/students`, handler: getStudents },
  { method: "GET", path: `${API_PREFIX}/students/:id`, handler: getStudentById },
  { method: "POST", path: `${API_PREFIX}/students`, handler: createStudent },
  { method: "PATCH", path: `${API_PREFIX}/students/:id`, handler: updateStudent },
  { method: "DELETE", path: `${API_PREFIX}/students/:id`, handler: deleteStudent },
  { method: "GET", path: `${API_PREFIX}/groups`, handler: getGroups },
  { method: "GET", path: `${API_PREFIX}/groups/:id`, handler: getGroupById },
  { method: "POST", path: `${API_PREFIX}/groups`, handler: createGroup },
  { method: "PATCH", path: `${API_PREFIX}/groups/:id`, handler: updateGroup },
  { method: "DELETE", path: `${API_PREFIX}/groups/:id`, handler: deleteGroup },
  { method: "GET", path: `${API_PREFIX}/courses`, handler: getCourses },
  { method: "GET", path: `${API_PREFIX}/courses/:id`, handler: getCourseById },
  { method: "POST", path: `${API_PREFIX}/courses`, handler: createCourse },
  { method: "PATCH", path: `${API_PREFIX}/courses/:id`, handler: updateCourse },
  { method: "DELETE", path: `${API_PREFIX}/courses/:id`, handler: deleteCourse },
  { method: "GET", path: `${API_PREFIX}/courses/:course_id/modules`, handler: getModules },
  { method: "POST", path: `${API_PREFIX}/courses/:course_id/modules`, handler: createModule },
  { method: "GET", path: `${API_PREFIX}/courses/:course_id/modules/:module_id`, handler: getModuleById },
  { method: "PATCH", path: `${API_PREFIX}/courses/:course_id/modules/:module_id`, handler: updateModule },
  { method: "DELETE", path: `${API_PREFIX}/courses/:course_id/modules/:module_id`, handler: deleteModule },
  { method: "GET", path: `${API_PREFIX}/courses/:course_id/lessons`, handler: getLessons },
  { method: "POST", path: `${API_PREFIX}/courses/:course_id/lessons`, handler: createLesson },
  { method: "GET", path: `${API_PREFIX}/courses/:course_id/lessons/:lesson_id`, handler: getLessonById },
  { method: "PATCH", path: `${API_PREFIX}/courses/:course_id/lessons/:lesson_id`, handler: updateLesson },
  { method: "DELETE", path: `${API_PREFIX}/courses/:course_id/lessons/:lesson_id`, handler: deleteLesson },
  { method: "GET", path: `${API_PREFIX}/courses/:course_id/lessons/:lesson_id/test`, handler: getTestById },
  { method: "POST", path: `${API_PREFIX}/courses/:course_id/lessons/:lesson_id/test`, handler: createTest },
  { method: "PUT", path: `${API_PREFIX}/courses/:course_id/lessons/:lesson_id/test`, handler: updateTest },
  { method: "DELETE", path: `${API_PREFIX}/courses/:course_id/lessons/:lesson_id/test`, handler: deleteTest },
];
