import template from './LoginLayout.html?raw'
import Layout from '../core/Layout'
import {getCurrentUser, login} from "../core/auth/api.js";
import {setUser} from "../core/auth/state.js";
import {HOME_BY_ROLE} from "../core/auth/constants.js";
import { themeToggle } from "../utils/themeToggle.js";
import { showAlert } from "../utils/dialogs.js";

export class LoginLayout extends Layout {
  async fetchData() {}

  render() {
    this.template = template;
  }

  mount() {
    const appContainer = document.getElementById("app");
    appContainer.innerHTML = this.template;
  }

  handleEvents() {
    this.loginForm = document.querySelector("[data-login-form]");
    this.themeToggleButton = document.querySelector('[data-action="toggle-theme"]');
    this.handleThemeToggle = themeToggle;
    this.themeToggleButton?.addEventListener("click", this.handleThemeToggle);
    if (!this.loginForm) return;
    this.boundLoginHandler = async (e) => {
      e.preventDefault();
      const formData = new FormData(this.loginForm);

      const body = new URLSearchParams(formData);

      try {
        await login(body);
        const user = await getCurrentUser();
        setUser(user);
        await window.router.navigate(HOME_BY_ROLE[user.role]);
      } catch (error) {
        if (error.status === 401) {
          await showAlert({
            title: "Ошибка входа",
            message: "Неправильный логин или пароль",
            variant: "danger",
          });
          return;
        }

        await showAlert({
          title: "Ошибка авторизации",
          message: "Не удалось выполнить вход",
          variant: "danger",
        });
      }

    };
    this.loginForm.addEventListener("submit", this.boundLoginHandler);
  }

  removeGlobalEventListeners() {
    this.loginForm?.removeEventListener("submit", this.boundLoginHandler);
    this.themeToggleButton?.removeEventListener("click", this.handleThemeToggle);
    this.loginForm = null;
    this.boundLoginHandler = null;
    this.themeToggleButton = null;
    this.handleThemeToggle = null;
  }
}
