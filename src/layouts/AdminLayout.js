import template from './AdminLayout.html?raw'
import Layout from '../core/Layout'
import {themeToggle, setTheme} from '../utils/themeToggle.js';
import {getAuthUser} from "../core/auth/state.js";
import {logout} from "../core/auth/api.js";
import { getPanelBasePath, getPanelPath, getPanelRoleLabel, isAdminRole } from "../utils/panelRoute.js";
import { showAlert, showConfirm } from "../utils/dialogs.js";

function getOverviewCardsMarkup(role) {
  const cards = [
    {
      href: getPanelPath("/teachers", role),
      icon: "fa-solid fa-chalkboard-user",
      title: "Преподаватели",
      text: "Держите под рукой список преподавателей и их профиль доступности по курсам и времени.",
    },
    {
      href: getPanelPath("/groups", role),
      icon: "fa-solid fa-users-rectangle",
      title: "Группы",
      text: "Создавайте группы, задавайте им расписание и подбирайте преподавателя под конкретный слот.",
    },
    {
      href: getPanelPath("/students", role),
      icon: "fa-solid fa-user-graduate",
      title: "Студенты",
      text: "Создавайте карточки учеников и сразу привязывайте их к нужным учебным группам.",
    },
  ];

  if (isAdminRole(role)) {
    cards.push(
      {
        href: "/admin/courses",
        icon: "fa-solid fa-book-open-reader",
        title: "Курсы",
        text: "Редактируйте структуру курсов, модули, уроки, материалы и тесты.",
      },
      {
        href: "/admin/managers",
        icon: "fa-solid fa-user-tie",
        title: "Менеджеры",
        text: "Создавайте менеджерские учетные записи и делегируйте работу с группами и назначениями.",
      },
    );
  }

  return cards.map((card) => `
    <a href="${card.href}" class="overview-card" data-spa-link>
      <span class="overview-card__icon"><i class="${card.icon}"></i></span>
      <strong class="overview-card__title">${card.title}</strong>
      <p class="overview-card__text">${card.text}</p>
    </a>
  `).join("");
}

function getNavigationMarkup(role) {
  const items = [
    {
      href: getPanelBasePath(role),
      match: getPanelBasePath(role),
      exact: "true",
      icon: "fa-solid fa-house",
      label: "Обзор",
    },
    {
      href: getPanelPath("/teachers", role),
      match: getPanelPath("/teachers", role),
      icon: "fa-solid fa-chalkboard-user",
      label: "Учителя",
    },
    {
      href: getPanelPath("/groups", role),
      match: getPanelPath("/groups", role),
      icon: "fa-solid fa-users-rectangle",
      label: "Группы",
    },
    {
      href: getPanelPath("/students", role),
      match: getPanelPath("/students", role),
      icon: "fa-solid fa-user-graduate",
      label: "Студенты",
    },
  ];

  if (isAdminRole(role)) {
    items.push(
      {
        href: "/admin/courses",
        match: "/admin/courses",
        icon: "fa-solid fa-book-open-reader",
        label: "Курсы",
      },
      {
        href: "/admin/managers",
        match: "/admin/managers",
        icon: "fa-solid fa-user-tie",
        label: "Менеджеры",
      },
    );
  }

  return `
    <ul class="app__menu">
      ${items.map((item) => `
        <li>
          <a href="${item.href}" data-spa-link data-route-match="${item.match}" ${item.exact ? `data-route-exact="${item.exact}"` : ""}>
            <i class="${item.icon}"></i>
            <span>${item.label}</span>
          </a>
        </li>
      `).join("")}
    </ul>
  `;
}

function getOverviewMarkup(user) {
  const role = user.role ?? "admin";
  const userName = `${user.last_name} ${user.first_name}`;
  const roleLabel = getPanelRoleLabel(role);

  return `
    <section class="app__overview" data-layout-overview>
      <div class="page-hero page-hero--dashboard">
        <div class="page-hero__main">
          <span class="page-hero__eyebrow">Digital Classroom</span>
          <h1 class="page-hero__title">${isAdminRole(role) ? "Единая панель управления учебной платформой" : "Рабочее пространство менеджера по группам"}</h1>
          <p class="page-hero__description">
            ${isAdminRole(role)
              ? "Работайте с преподавателями, курсами, группами, студентами и менеджерами в одном интерфейсе."
              : "Создавайте группы и карточки учеников, задавайте расписание и подбирайте преподавателей под реальные временные окна."}
          </p>
        </div>
        <div class="page-hero__meta">
          <div class="page-hero__meta-card">
            <span class="page-hero__meta-label">Текущий пользователь</span>
            <strong class="page-hero__meta-value">${userName}</strong>
          </div>
          <div class="page-hero__meta-card">
            <span class="page-hero__meta-label">Роль</span>
            <strong class="page-hero__meta-value">${roleLabel}</strong>
          </div>
        </div>
      </div>

      <div class="app__overview-grid">
        ${getOverviewCardsMarkup(role)}
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
    const role = user.role ?? "admin";
    const panelBasePath = getPanelBasePath(role);

    const wrapper = document.createElement("div");
    wrapper.innerHTML = template;
    const userFullName = wrapper.querySelector("[data-user-full-name]");
    userFullName.textContent = `${user.last_name} ${user.first_name}`;
    wrapper.querySelectorAll("[data-panel-home-link]").forEach((link) => {
      link.setAttribute("href", panelBasePath);
    });
    const panelSubtitle = wrapper.querySelector("[data-panel-subtitle]");
    if (panelSubtitle) {
      panelSubtitle.textContent = isAdminRole(role) ? "Администрирование платформы" : "Панель менеджера";
    }
    const panelModeLabel = wrapper.querySelector("[data-panel-mode-label]");
    if (panelModeLabel) {
      panelModeLabel.textContent = isAdminRole(role) ? "Админ-панель" : "Панель менеджера";
    }
    const navigation = wrapper.querySelector("[data-panel-navigation]");
    if (navigation) {
      navigation.innerHTML = getNavigationMarkup(role);
    }
    const component = wrapper.querySelector("#component");
    if (window.location.pathname === panelBasePath) {
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
      const isExit = await showConfirm({
        title: "Выход из аккаунта",
        message: "Вы уверены, что хотите выйти?",
        confirmText: "Выйти",
      });
      if (!isExit) return;

      try {
        await logout();
        await window.router.navigate("/login");
      } catch (error) {
        await showAlert({
          title: "Не удалось выйти",
          message: "Произошла ошибка при попытке выхода",
          variant: "danger",
        });
        console.error(error);
      }
    };

    this.logoutButton?.addEventListener('click', this.boundLogoutHandler);
    this.onRouteChange(window.location.pathname);
  }

  onRouteChange(pathname) {
    const navLinks = document.querySelectorAll("[data-route-match]");
    const panelBasePath = getPanelBasePath();
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

    if (pathname === panelBasePath && component.childElementCount === 0) {
      const user = getAuthUser();
      component.innerHTML = getOverviewMarkup(user);
      return;
    }

    if (pathname !== panelBasePath) {
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
