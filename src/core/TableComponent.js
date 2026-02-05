export default class TableComponent {
  constructor({Service, template, rowRenderer, idAttr, entityName, emptyRow = ""} ) {

    this.data = null;
    this.template = template;
    this.rowRenderer = rowRenderer;
    this.idAttr = idAttr;
    this.entityName = entityName;
    this.emptyRow = emptyRow;
    this.rowsHTML = null;
    this.tbody = null;
    this.boundClickHandler = null;
    this.elements = {};
    this.Service = Service;
  }

  async fetchData() {
    try {
      this.data = await this.Service.getAll();
    } catch (error) {
      this.data = [];
      console.error(error);
    }
  }

  render() {
    this.rowsHTML = this.data.map(entity => this.rowRenderer(entity)).join("");
    if (!this.rowsHTML) {
      this.rowsHTML = this.emptyRow;
    }
  }

  mount() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = this.template;
    this.tbody = componentContainer.querySelector(".table__body");
    if (this.tbody) {
      this.tbody.innerHTML = this.rowsHTML;
    }
  }

  handleEvents() {
    this.boundClickHandler = async (event) => {
      const btn = event.target.closest("[data-action]");
      const tr = event.target.closest("tr");

      if (!btn) return;

      if (btn.dataset.action === "delete") {
        const id = tr.dataset[this.idAttr];
        const accept = confirm(`Удалить ${this.entityName} ID: ${id}`);
        if (!accept) return;

        try {
          const success = await this.Service.delete(id);
          if (success) tr.remove();
        } catch (error) {
          console.error("Возникла ошибка при удалении: ", error);
        }
      }
    };

    this.tbody.addEventListener("click", this.boundClickHandler);
  }

  removeEventListeners() {
    if (this.boundClickHandler) {
      this.tbody.removeEventListener("click", this.boundClickHandler);
    }
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