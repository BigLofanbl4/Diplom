import template from './PublicLayout.html?raw'
import Layout from '../core/Layout'
import { themeToggle } from '../utils/themeToggle.js';

export class PublicLayout extends Layout {
  async fetchData() {}

  render() {
    this.template = template;
  }

  mount() {
    const appContainer = document.getElementById("app");
    appContainer.innerHTML = this.template;
  }

  handleEvents() {
    this.themeToggleButton = document.querySelector('[data-action="toggle-theme"]');
    this.handleThemeToggle = themeToggle;
    this.themeToggleButton?.addEventListener("click", this.handleThemeToggle);
  }

  removeGlobalEventListeners() {
    this.themeToggleButton?.removeEventListener("click", this.handleThemeToggle);
    this.themeToggleButton = null;
    this.handleThemeToggle = null;
  }
}
