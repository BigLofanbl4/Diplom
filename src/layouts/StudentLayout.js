import template from "./StudentLayout.html?raw";
import Layout from "../core/Layout.js";
import { themeToggle, setTheme } from "../utils/themeToggle.js";
import { getAuthUser } from "../core/auth/state.js";
import { logout } from "../core/auth/api.js";

export class StudentLayout extends Layout {
  async fetchData() {
    this.data = null;
  }

  render() {
    const user = getAuthUser();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = template;

    const userFullName = wrapper.querySelector("[data-user-full-name]");
    if (userFullName && user) {
      userFullName.textContent = `${user.last_name} ${user.first_name}`;
    }

    this.template = wrapper.innerHTML;
    setTheme();
  }

  mount() {
    document.getElementById("app").innerHTML = this.template;
  }

  handleEvents() {
    this.themeToggleButton = document.querySelector('[data-action="toggle-theme"]');
    this.handleThemeToggle = themeToggle;
    this.themeToggleButton?.addEventListener("click", this.handleThemeToggle);

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
    this.logoutButton?.addEventListener("click", this.boundLogoutHandler);

    this.onRouteChange(window.location.pathname);
  }

  onRouteChange(pathname) {
    const navLinks = document.querySelectorAll("[data-route-match]");
    const matches = Array.from(navLinks).map((link) => {
      const route = link.dataset.routeMatch;
      const exact = link.dataset.routeExact === "true";
      const isActive = exact
        ? pathname === route
        : pathname === route || pathname.startsWith(`${route}/`);

      return { link, isActive, score: isActive ? route.length : -1 };
    });

    const activeMatch = matches.filter((match) => match.isActive).sort((a, b) => b.score - a.score)[0] ?? null;

    matches.forEach(({ link, isActive }) => {
      const shouldHighlight = Boolean(isActive && activeMatch?.link === link);
      link.classList.toggle("active", shouldHighlight);
      link.setAttribute("aria-current", shouldHighlight ? "page" : "false");
    });
  }

  removeGlobalEventListeners() {
    this.themeToggleButton?.removeEventListener("click", this.handleThemeToggle);
    this.logoutButton?.removeEventListener("click", this.boundLogoutHandler);
  }
}
