export default class FormComponent {
  constructor({Service, mode = "create", id = null, containerElementId = "component"}) {
    if (new.target === FormComponent) {
      throw new Error("FormComponent is an abstract class and cannot be instantiated directly");
    }

    this.id = id;
    this.Service = Service;
    this.mode = mode;
    this.template = "";
    this.data = {};
    this.successHandler = null;
    this.cancelHandler = null;
    this.boundHandler = null;
    this.form = null;
    this.containerElementId = containerElementId;
    this.containerElement = null;
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    if (this.id && this.mode === "update") {
      this.setFormValues();
    }
    this.initCustomFields();
    this.handleEvents();
  }

  render() {
    if (!this.template) {
      throw new Error("render() must be implemented");
    }
  }

  mount() {
    this.containerElement = document.getElementById(this.containerElementId);
    if (!this.containerElement) return;
    this.containerElement.innerHTML = this.template;
    this.form = this.containerElement.querySelector("form");
  }

  initCustomFields() {
  }

  async fetchData() {
    if (this.id && this.Service) {
      try {
        this.data = await this.Service.getById(this.id);
      } catch (error) {
        // Уведомление об ошибке 
        console.error("Ошибка загрузки данных:", error);
      }
    }
  }

  setFormValues() {
    for (const [key, value] of Object.entries(this.data)) {
      const input = this.form.elements[key];
      if (input) {
        if (input.type === "checkbox") input.checked = value
        else input.value = value || "";
      }
    }
  }

  getFormData() {
    const data = {};
    const formData = new FormData(this.form);
    const allKeys = [...new Set(Array.from(this.form.elements))]
      .map(element => element.name)
      .filter(key => key);

    allKeys.forEach(key => {
      const element = this.form.elements[key];

      if (key.endsWith("[]")) {
        const value = formData.getAll(key);
        const cleanKey = key.slice(0, -2);
        data[cleanKey] = value;
      } else {
        if (element.type === "checkbox") {
          data[key] = element.checked;
        } else if (element.type === "number") {
          data[key] = Number(formData.get(key));
        } else {
          data[key] = formData.get(key);
        }
      }
    });
    return data;
  }

  handleEvents() {
    this.boundHandler = async (event) => {
      if (event.target.closest("[data-action='cancel']")) {
        if (this.cancelHandler) this.cancelHandler();
      } else if (event.target.closest("[data-action='submit']")) {
        event.preventDefault();
        const formData = this.getFormData();
        if (!this.isFormValid()) {
          this.highlightInvalidFields();
          return;
        }
        await this.submit(formData);
        if (this.successHandler) this.successHandler();
      }
    };

    this.form.addEventListener("click", this.boundHandler);
  }

  removeEventListeners() {
    this.form.removeEventListener("click", this.boundHandler);
  }

  isFormValid() {
    return this.form.checkValidity();
  }

  highlightInvalidFields() {
    const fields = Array.from(this.form.elements);
    fields.forEach((field) => {
      if (!field.name && !field.validity.valid) {
        field.classList.add("invalid");
      } else {
        field.classList.remove("invalid");
      }
    });

    this.form.reportValidity();
  }

  async submit(data) {
    try {
      if (this.mode === "create") {
        await this.Service.create(data);
      } else if (this.mode === "update") {
        await this.Service.update(this.id, data);
      }
    } catch (error) {
      // Уведомление об ошибке
      console.error("Ошибка отправки данных:", error);
    }
  }

  destroy() {
    if (this.containerElement.getAttribute("id") !== "component") {
      this.containerElement.remove();
    } else {
      this.containerElement.innerHTML = "";
    }

    this.removeEventListeners();
  }
}