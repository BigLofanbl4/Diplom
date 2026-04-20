import './styles/index.css'
import { Router } from "./router";
import { AdminLayout } from "./layouts/AdminLayout";
import { TeacherLayout } from "./layouts/TeacherLayout.js";
import { LoginLayout } from "./layouts/LoginLayout.js";
import { PublicLayout } from "./layouts/PublicLayout.js";
import { setTheme } from "./utils/themeToggle.js";
import { TeacherForm, TeachersTable } from "./components/admin_teachers/index.js";
import { StudentForm, StudentsTable } from "./components/admin_students/index.js";
import { GroupForm, GroupsTable } from "./components/admin_groups/index.js";
import { CourseForm, CoursePage, CoursesList } from "./components/admin_courses/index.js";
import TestConstructor from "./components/admin_courses/features/TestConstructor/TestConstructor.js";
import TeacherGroups from "./components/admin_teachers/pages/TeacherGroups/TeacherGroups.js";
import AssignTeacher from "./components/admin_groups/pages/AssignTeacher/AssignTeacher.js";
import { TeacherDashboard, TeacherGroupPage, TeacherPreferences } from "./components/teacher/index.js";

setTheme();

const ROUTES = {
  "/": {
    Layout: PublicLayout,
    meta: {
      access: "public",
      role: "guest"
    }
  },
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
  },
  "/admin/teachers/:teacherId/groups": {
    Layout: AdminLayout,
    Component:TeacherGroups,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/admin/groups/:groupId/teacher": {
    Layout: AdminLayout,
    Component: AssignTeacher,
    meta: {
      access: "requiresAuth",
      role: "admin"
    }
  },
  "/teacher": {
    Layout: TeacherLayout,
    Component: TeacherDashboard,
    meta: {
      access: "requiresAuth",
      role: "teacher"
    }
  },
  "/teacher/groups": {
    Layout: TeacherLayout,
    Component: TeacherDashboard,
    meta: {
      access: "requiresAuth",
      role: "teacher"
    }
  },
  "/teacher/groups/:groupId": {
    Layout: TeacherLayout,
    Component: TeacherGroupPage,
    meta: {
      access: "requiresAuth",
      role: "teacher"
    }
  },
  "/teacher/preferences": {
    Layout: TeacherLayout,
    Component: TeacherPreferences,
    meta: {
      access: "requiresAuth",
      role: "teacher"
    }
  },
  "/teacher/groups/:groupId/courses/:courseId/lessons/:lessonId/test": {
    Layout: TeacherLayout,
    Component: TestConstructor,
    meta: {
      access: "requiresAuth",
      role: "teacher"
    }
  }
};

window.router = new Router(ROUTES);
