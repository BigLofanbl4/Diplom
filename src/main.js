import './styles/index.css'
import { Router } from "./router";
import { AdminLayout } from "./layouts/AdminLayout";
import { LoginLayout } from "./layouts/LoginLayout.js";
import { TeacherForm, TeachersTable } from "./components/admin_teachers/index.js";
import { StudentForm, StudentsTable } from "./components/admin_students/index.js";
import { GroupForm, GroupsTable } from "./components/admin_groups/index.js";
import { CourseForm, CoursePage, CoursesList } from "./components/admin_courses/index.js";
import TestConstructor from "./components/admin_courses/features/TestConstructor/TestConstructor.js";

const ROUTES = {
  "/login": {
    Layout: LoginLayout,
    meta: {
      access: "guestOnly",
      role: "guest"
    }
  },
  "/admin": {
    Layout: AdminLayout,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/teachers": {
    Layout: AdminLayout,
    Component: TeachersTable,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/teachers/create": {
    Layout: AdminLayout,
    Component: TeacherForm,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/teachers/update/:id": {
    Layout: AdminLayout,
    Component: TeacherForm,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/students": {
    Layout: AdminLayout,
    Component: StudentsTable,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/students/create": {
    Layout: AdminLayout,
    Component: StudentForm,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/students/update/:id": {
    Layout: AdminLayout,
    Component: StudentForm,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/groups": {
    Layout: AdminLayout,
    Component: GroupsTable,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/groups/create": {
    Layout: AdminLayout,
    Component: GroupForm,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/groups/update/:id": {
    Layout: AdminLayout,
    Component: GroupForm,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/courses": {
    Layout: AdminLayout,
    Component: CoursesList,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/courses/create": {
    Layout: AdminLayout,
    Component: CourseForm,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/courses/update/:id": {
    Layout: AdminLayout,
    Component: CourseForm,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/courses/:id": {
    Layout: AdminLayout,
    Component: CoursePage,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/courses/:courseId/lessons/:lessonId/test": {
    Layout: AdminLayout,
    Component: TestConstructor,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  }
};

window.router = new Router(ROUTES);
