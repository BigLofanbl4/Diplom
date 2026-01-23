export default class Layout {
  constructor() {
    if (new.target === Layout) {
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

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    this.handleEvents();
  }
}