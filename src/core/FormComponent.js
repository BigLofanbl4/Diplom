import FormValidator from "./FormValidator";

export default class FormComponent {
  constructor({Service, mode = "create", id = null, containerElement = null }) {
    if (new.target === FormComponent) {
      throw new Error('FormComponent is an abstract class and cannot be instantiated directly');
    }

    this.id = id;
    this.Service = Service;
    this.mode = mode;
    this.template = "";
    this.data = {};

    this.successUrl = null;
    this.cancelUrl = null;
    this.successHandler = async () => {
      if (this.successUrl) await window.router.navigate(this.successUrl)
    };
    this.cancelHandler = async () => {
      if (this.cancelUrl) await window.router.navigate(this.cancelUrl)
    };

    this.boundClickHandler = null;
    this.boundSubmitHandler = null;

    this.form = null;
    this.containerElement = containerElement;

    this.validatorClass = FormValidator;
    this.validator = null;
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    if (!this.form) {
      alert("Ошибка при загрузке формы!");
      throw new Error("Произошла ошибка при загрузке формы!");
    }
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
    this.containerElement = this.containerElement ? this.containerElement : document.getElementById("component");
    if (!this.containerElement) return;
    this.containerElement.innerHTML = this.template;
    this.form = this.containerElement.querySelector("form");
    this.validator = new this.validatorClass(this.form);
  }

  initCustomFields() {}

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

    for (const [key, value] of formData.entries()) {
      const element = this.form.elements[key];
      if (!element) continue;

      if (element.type === "checkbox") {
        data[key] = element.checked;
      } else if (element.type === "number") {
        data[key] = value === "" ? null : Number(value);
      } else {
        data[key] = value;
      }
    }

    return data;
  }


  handleEvents() {
    this.boundClickHandler = async (event) => {
      if (event.target.closest("[data-action='cancel']")) {
        event.preventDefault();
        if (this.cancelHandler) this.cancelHandler();
      }
    };

    this.boundSubmitHandler = async (event) => {
      event.preventDefault();
      const raw = this.getFormData();
      const payload = this.normalizePayload(raw);
      if (!this.isFormValid()) {
        this.highlightInvalidFields();
        return;
      }
      try {
        const result = await this.submit(payload);
        this.successHandler?.(result);
      } catch (error) {
        alert("Произошла ошибка при отправке формы");
        console.error(error);
        this.cancelHandler?.();
      }
    }

    this.form.addEventListener("submit", this.boundSubmitHandler);
    this.form.addEventListener("click", this.boundClickHandler);
  }

  removeEventListeners() {
    if (!this.form) return;
    this.form.removeEventListener("submit", this.boundSubmitHandler);
    this.form.removeEventListener("click", this.boundClickHandler);
  }

  isFormValid() {
    return this.validator.isValid();
  }

  highlightInvalidFields() {
    this.validator.highlightInvalidFields();
  }

  async submit(data) {
    if (this.mode === "create") {
      return await this.Service.create(data);
    } else if (this.mode === "update") {
      return await this.Service.update(this.id, data);
    }
  }

  normalizePayload(payload) {
    return payload;
  }

  destroy() {
    if (this.form) this.form.remove();
    this.removeEventListeners();
  }
}