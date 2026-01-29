import './style.css'
import { Router } from "./router";
import { AdminLayout } from "./layouts/AdminLayout";
import TeachersTable from './components/admin_teachers/TeachersTable';
import TeacherForm from './components/admin_teachers/TeacherForm';
import StudentsTable from './components/admin_students/StudentsTable';

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
  }
};

window.router = new Router(ROUTES);