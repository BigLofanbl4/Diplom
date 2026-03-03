import template from './AdminLayout.html?raw'
import Layout from '../core/Layout'
import {themeToggle, setTheme} from '../utils/themeToggle.js';
import {getAuthUser} from "../core/auth/state.js";
import {logout} from "../core/auth/api.js";


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