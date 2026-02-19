import template from './AdminLayout.html?raw'
import Layout from '../core/Layout'
import {themeToggle, setTheme} from '../utils/themeToggle.js';


export class AdminLayout extends Layout {
  async fetchData() {
    this.data = "Новые данные";
  }

  render() {
    this.template = template;
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
  }

  removeGlobalEventListeners() {
    this.themeToggleButton?.removeEventListener('click', this.handleThemeToggle);
    this.themeToggleButton = null;
    this.handleThemeToggle = null;
  }
}