import './style.css'
import { Router } from "./router";
import { AdminLayout } from "./layouts/AdminLayout";
import TeachersTable from './components/admin_teachers/TeachersTable';
import TeacherForm from './components/admin_teachers/TeacherForm';
import StudentsTable from './components/admin_students/StudentsTable';
import StudentForm from './components/admin_students/StudentForm';
import GroupsTable from './components/admin_groups/GroupsTable';
import GroupForm from './components/admin_groups/GroupForm';
import CoursesList from "./components/admin_courses/CoursesList.js";
import CourseForm from "./components/admin_courses/CourseForm.js";

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
  }
};

window.router = new Router(ROUTES);