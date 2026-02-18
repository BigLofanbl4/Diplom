import './styles/index.css'
import { Router } from "./router";
import { AdminLayout } from "./layouts/AdminLayout";
import { TeacherForm, TeachersTable } from "./components/admin_teachers/index.js";
import { StudentForm, StudentsTable } from "./components/admin_students/index.js";
import { GroupForm, GroupsTable } from "./components/admin_groups/index.js";
import { CourseForm, CoursePage, CoursesList } from "./components/admin_courses/index.js";
import TestConstructor from "./components/admin_courses/features/TestConstructor/TestConstructor.js";

const ROUTES = {
  "/admin": {
    Layout: AdminLayout
  },
  "/admin/teachers": {
    Layout: AdminLayout,
    Component: TeachersTable,
  },
  "/admin/teachers/create": {
    Layout: AdminLayout,
    Component: TeacherForm
  },
  "/admin/teachers/update/:id": {
    Layout: AdminLayout,
    Component: TeacherForm
  },
  "/admin/students": {
    Layout: AdminLayout,
    Component: StudentsTable
  },
  "/admin/students/create": {
    Layout: AdminLayout,
    Component: StudentForm
  },
  "/admin/students/update/:id": {
    Layout: AdminLayout,
    Component: StudentForm
  },
  "/admin/groups": {
    Layout: AdminLayout,
    Component: GroupsTable
  },
  "/admin/groups/create": {
    Layout: AdminLayout,
    Component: GroupForm
  },
  "/admin/groups/update/:id": {
    Layout: AdminLayout,
    Component: GroupForm
  },
  "/admin/courses": {
    Layout: AdminLayout,
    Component: CoursesList
  },
  "/admin/courses/create": {
    Layout: AdminLayout,
    Component: CourseForm
  },
  "/admin/courses/update/:id": {
    Layout: AdminLayout,
    Component: CourseForm
  },
  "/admin/courses/:id": {
    Layout: AdminLayout,
    Component: CoursePage
  },
  "/admin/courses/:courseId/test/:lessonId": {
    Layout: AdminLayout,
    Component: TestConstructor
  }
};

window.router = new Router(ROUTES);
