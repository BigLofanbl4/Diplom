import template from './AdminLayout.html?raw'
import Layout from '../core/Layout'


export class AdminLayout extends Layout {
  async fetchData() {
    console.log("Тянем данные...");
    this.data = "Новые данные";
  }

  render() {
    console.log("Рендер панели управления...")
    this.template = template;
  }

  mount() {
    const appContainer = document.getElementById("app");
    appContainer.innerHTML = this.template;
  }

  handleEvents() {
    console.log("Назначение обработчиков событий...")
  }
}