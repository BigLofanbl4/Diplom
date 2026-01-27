export default class FormComponent {
  constructor(Service, mode = "create", id = null) {
    if (new.target === FormComponent) {
      throw new Error("FormComponent is an abstract class and cannot be instantiated directly");
    }

    this.id = id;
    this.Service = Service;
    this.mode = mode;
    this.template = "";
    this.data = {};
    this.successUrl = "";
    this.boundHandler = null;
    this.form = null;
  }

  async draw() {
    this.render();
    this.mount();
    if (this.id && this.mode === "update") {
      await this.fillData();
    }
    this.handleEvents();
  }

  render() {
    throw new Error("render() must be implemented");
  }

  mount() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = this.template;
    this.form = componentContainer.querySelector("form");
  }

  async fillData() {
    try {
      this.data = await this.Service.getById(this.id);
      this.setFormValues();
    } catch (error) {
      // Уведомление об ошибке 
      console.error("Ошибка загрузки данных:", error);
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
    const formData = new FormData(this.form);
    return Object.fromEntries(formData);
  }

  handleEvents() {
    this.boundHandler = async (event) => {
      if (event.target.closest("[data-action='cancel']")) {
        window.router.back();
      } else if (event.target.closest("[data-action='submit']")) {
        event.preventDefault();
        const formData = this.getFormData();
        await this.submit(formData);
        if (this.successUrl) window.router.navigate(this.successUrl);
      }
    };

    this.form.addEventListener("click", this.boundHandler);
  }

  removeEventListeners() {
    this.form.removeEventListener("click", this.boundHandler);
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
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = "";

    this.removeEventListeners();
  }
}