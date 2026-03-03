import template from './LoginLayout.html?raw'
import Layout from '../core/Layout'
import {getCurrentUser, login} from "../core/auth/api.js";
import {setUser} from "../core/auth/state.js";
import {HOME_BY_ROLE} from "../core/auth/constants.js";

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
          alert("Неправильный логин или пароль");
          return;
        }

        alert("Ошибка авторизации");
      }

    };
    this.loginForm.addEventListener("submit", this.boundLoginHandler);
  }

  removeGlobalEventListeners() {
    this.loginForm?.removeEventListener("submit", this.boundLoginHandler);
    this.loginForm = null;
    this.boundLoginHandler = null;
  }
}