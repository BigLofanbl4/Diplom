export default class TableComponent {
  constructor({Service, template, rowRenderer, idAttr, entityName, emptyRow = "", containerElement } ) {
    this.response = null;
    this.items = [];
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
    this.containerElement = containerElement;
    this.root = null;
  }

  async fetchData() {
    try {
      this.response = await this.Service.getAll();
      this.items = Array.isArray(this.response?.data) ? this.response.data : [];
    } catch (error) {
      this.response = { data: [] };
      this.items = [];
      console.error(error);
    }
  }

  render() {
    this.rowsHTML = this.items.map(entity => this.rowRenderer(entity)).join("");
    if (!this.rowsHTML) {
      this.rowsHTML = this.emptyRow;
    }
    this.root = document.createElement("div");
    this.root.dataset.root = "";
    this.root.innerHTML = this.template;
    this.tbody = this.root.querySelector("tbody");
    if (this.tbody) {
      this.tbody.innerHTML = this.rowsHTML;
    }
  }

  mount() {
    if (!this.containerElement) {
      this.containerElement = document.getElementById("component");
    }
    this.containerElement.appendChild(this.root);
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

    if (!this.tbody) return;
    this.tbody.addEventListener("click", this.boundClickHandler);
  }

  removeEventListeners() {
    if (this.boundClickHandler && this.tbody) {
      this.tbody.removeEventListener("click", this.boundClickHandler);
    }
  }

  destroy() {
    if (this.root) this.root.remove();

    this.elements = {};
    this.response = null;
    this.items = [];

    this.removeEventListeners();
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    this.handleEvents();
  }
}
