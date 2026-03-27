import template from './AdminLayout.html?raw'
import Layout from '../core/Layout'
import {themeToggle, setTheme} from '../utils/themeToggle.js';
import {getAuthUser} from "../core/auth/state.js";
import {logout} from "../core/auth/api.js";

function getOverviewMarkup(user) {
  const userName = `${user.last_name} ${user.first_name}`;

  return `
    <section class="app__overview" data-layout-overview>
      <div class="page-hero page-hero--dashboard">
        <div class="page-hero__main">
          <span class="page-hero__eyebrow">Digital Classroom</span>
          <h1 class="page-hero__title">Единая панель управления учебной платформой</h1>
          <p class="page-hero__description">
            Работайте с преподавателями, курсами, группами и студентами в одном интерфейсе. Все ключевые действия вынесены в отдельные разделы, чтобы ежедневная администрирующая рутина занимала меньше времени.
          </p>
        </div>
        <div class="page-hero__meta">
          <div class="page-hero__meta-card">
            <span class="page-hero__meta-label">Текущий пользователь</span>
            <strong class="page-hero__meta-value">${userName}</strong>
          </div>
          <div class="page-hero__meta-card">
            <span class="page-hero__meta-label">Роль</span>
            <strong class="page-hero__meta-value">Администратор</strong>
          </div>
        </div>
      </div>

      <div class="app__overview-grid">
        <a href="/admin/teachers" class="overview-card" data-spa-link>
          <span class="overview-card__icon"><i class="fa-solid fa-chalkboard-user"></i></span>
          <strong class="overview-card__title">Преподаватели</strong>
          <p class="overview-card__text">Поддерживайте актуальные профили, назначайте группы и проверяйте загрузку.</p>
        </a>
        <a href="/admin/groups" class="overview-card" data-spa-link>
          <span class="overview-card__icon"><i class="fa-solid fa-users-rectangle"></i></span>
          <strong class="overview-card__title">Группы</strong>
          <p class="overview-card__text">Формируйте составы групп, связывайте их с курсами и назначайте преподавателей.</p>
        </a>
        <a href="/admin/courses" class="overview-card" data-spa-link>
          <span class="overview-card__icon"><i class="fa-solid fa-book-open-reader"></i></span>
          <strong class="overview-card__title">Курсы</strong>
          <p class="overview-card__text">Редактируйте структуру курсов, модули, уроки, материалы и тесты.</p>
        </a>
        <a href="/admin/students" class="overview-card" data-spa-link>
          <span class="overview-card__icon"><i class="fa-solid fa-user-graduate"></i></span>
          <strong class="overview-card__title">Студенты</strong>
          <p class="overview-card__text">Управляйте карточками студентов и отслеживайте их распределение по группам.</p>
        </a>
      </div>
    </section>
  `;
}

export class AdminLayout extends Layout {
  async fetchData() {
    this.data = "Новые данные";
  }

  render() {
    const user = getAuthUser();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = template;
    const userFullName = wrapper.querySelector("[data-user-full-name]");
    userFullName.textContent = `${user.last_name} ${user.first_name}`;
    const component = wrapper.querySelector("#component");
    if (window.location.pathname === "/admin") {
      component.innerHTML = getOverviewMarkup(user);
    }

    this.template = wrapper.innerHTML;
    setTheme();
  }

  mount() {
    const appContainer = document.getElementById("app");
    appContainer.innerHTML = this.template;
  }

  handleEvents() {
    this.themeToggleButton = document.querySelector('[data-action="toggle-theme"]');
    this.handleThemeToggle = themeToggle;
    this.themeToggleButton?.addEventListener('click', this.handleThemeToggle);

    this.logoutButton = document.querySelector('[data-action="logout"]');
    this.boundLogoutHandler = async () => {
      const isExit = confirm("Вы уверены, что хотите выйти?");
      if (!isExit) return;

      try {
        await logout();
        await window.router.navigate("/login");
      } catch (error) {
        alert("Произошла ошибка при попытке выхода");
        console.error(error);
      }
    };

    this.logoutButton?.addEventListener('click', this.boundLogoutHandler);
    this.onRouteChange(window.location.pathname);
  }

  onRouteChange(pathname) {
    const navLinks = document.querySelectorAll("[data-route-match]");
    navLinks.forEach((link) => {
      const route = link.dataset.routeMatch;
      const exact = link.dataset.routeExact === "true";
      const isActive = exact
        ? pathname === route
        : pathname === route || pathname.startsWith(`${route}/`);
      link.classList.toggle("active", isActive);
      link.setAttribute("aria-current", isActive ? "page" : "false");
    });

    const component = document.getElementById("component");
    if (!component) return;
    const overview = component.querySelector("[data-layout-overview]");

    if (pathname === "/admin" && component.childElementCount === 0) {
      const user = getAuthUser();
      component.innerHTML = getOverviewMarkup(user);
      return;
    }

    if (pathname !== "/admin") {
      overview?.remove();
    }
  }

  removeGlobalEventListeners() {
    this.themeToggleButton?.removeEventListener('click', this.handleThemeToggle);
    this.logoutButton?.removeEventListener('click', this.boundLogoutHandler);
    this.themeToggleButton = null;
    this.handleThemeToggle = null;
    this.logoutButton = null;
    this.boundLogoutHandler = null;
  }
}
