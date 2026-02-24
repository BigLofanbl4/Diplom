import { API_PREFIX } from "./config.js";
import {
  createTeacher,
  deleteTeacher,
  getTeacherById,
  getTeachers,
  updateTeacher,
} from "./handlers/teachers.js";
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

export const routes = [
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
];
