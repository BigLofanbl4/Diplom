import './style.css'
import { Router } from "./router";
import { AdminLayout } from "./layouts/AdminLayout";
import TeachersList from './components/admin_teachers/TeachersList';


const ROUTES = {
  "/admin": {
    Layout: AdminLayout,
    Component: TeachersList,
    meta: {
      title: "Панель управления"
    }
  }
};

new Router(ROUTES);