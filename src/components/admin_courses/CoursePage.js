import template from "./CoursePage.html?raw";


export default class CoursePage {
  constructor() {
    this.template = template;
    this.data = {
      "title": "Курс Frontend-разработка",
      "description": "Курс по HTML, CSS, JS, Vue.js",
    };
  }


  mount() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = this.template;
    this.generalForm = componentContainer.querySelector("#course-general-form");
    this.modulesContainer = componentContainer.querySelector(".course-modules__body");
  }

  handleEvents() {
    this.generalForm.addEventListener("input", (e) => {
      const formControls = this.generalForm.querySelector(".course__general-form-controls");
      if (!formControls) return;
      const formFields = Array.from(this.generalForm.elements).filter(e => e.name !== "");
      const same = formFields.every(field => this.data[field.name] === field.value);
      if (!same) {
        formControls.style.display = "flex";
      } else {
        formControls.style.display = "none";
      }
    });

    this.modulesContainer.addEventListener("click", (e) => {
      const target = e.target;
      if (!target.closest("[data-action]") && target.closest(".course-module__header")) {
        const moduleContainer = target.closest("[data-module-id]");
        if (!moduleContainer) return;
        moduleContainer.dataset.lessonsHidden = moduleContainer.dataset.lessonsHidden === "true" ? "false" : "true";
      }
    });
  }

  draw() {
    this.mount();
    this.handleEvents();
  }

  destroy() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = "";
  }
}
