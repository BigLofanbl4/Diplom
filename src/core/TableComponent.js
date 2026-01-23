export default class TableComponent {
  constructor() {
    if (new.target === TableComponent) {
      throw new Error('TableComponent is an abstract class and cannot be instantiated directly');
    }

    this.data = null;
    this.template = null;
    this.rows = null;
    this.elements = {};
  }

  async fetchData() {
    throw new Error("fetchData() must be implemented");
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

  removeEventListeners() {
    console.warn("removeGlobalEventListeners() must be implemented");
  }

  destroy() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = "";

    this.elements = {};
    this.data = null;

    this.removeEventListeners();
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    this.handleEvents();
  }
}