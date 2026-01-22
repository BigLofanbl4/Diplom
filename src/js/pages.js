

class Page {
  constructor() {
    if (new.target === Page) {
      throw new Error('Page is an abstract class and cannot be instantiated directly');
    }

    this.template = null;
    this.elements = {};
    this.data = null;
  }

  async fetchData() {
    throw new Error("fetchDat() must be implemented");
  }

  render() {
    throw new Error("render() must be implemented");
  }

  mount() {
    throw new Error("mount() must be implemented");
  }

  handleEvents() {
    throw new Error("handleEvents() must be implemented");
  }

  removeGlobalEventListeners() {
    console.warn("removeGlobalEventListeners() must be implemented");
  }

  destroy() {
    const appContainer = document.getElementById("app");
    appContainer.innerHTML = "";

    this.elements = {};
    this.data = null;

    this.removeGlobalEventListeners();
  }

  async drawPage() {
    await this.fetchData();
    this.render();
    this.mount();
    this.handleEvents();
  }
}

export class Home extends Page {
  async fetchData() {
    console.log("Тянем данные...");
    this.data = "Новые данные";
  }

  render() {
    console.log("Создание виртуального DOM главной страницы...");
    this.template = `<h1>Главная страница</h1>`;
  }

  mount() {
    const appContainer = document.getElementById("app");
    appContainer.innerHTML = this.template;
  }

  handleEvents() {
    console.log("Назначение обработчиков событий...")
  }
}

export class Admin extends Page {
  async fetchData() {
    console.log("Тянем данные...");
    this.data = "Новые данные";
  }

  render() {
    console.log("Рендер панели управления...")
    this.template = `<h1>Панель управления</h1>`
  }

  mount() {
    const appContainer = document.getElementById("app");
    appContainer.innerHTML = this.template;
  }

  handleEvents() {
    console.log("Назначение обработчиков событий...")
  }
}
