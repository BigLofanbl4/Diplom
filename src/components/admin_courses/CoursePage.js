import {CoursePageTemplate} from "./CoursePage.template.js";
import ModuleForm from "./ModuleForm";
import LessonForm from "./LessonForm";
import ModalWithComponent from "../common/ModalWithComponent/ModalWithComponent";
import CourseService from "../../services/CourseService";
import ModuleService from "../../services/ModuleService";
import LessonService from "../../services/LessonService";


function lessonRenderer(lesson) {
  return `
    <li class="course-lesson" data-lesson-id="${lesson.id}">
      <h5 class="course-lesson__title">
        <span class="course-lesson__number">Урок ${lesson.lesson_number}:</span>
        <span class="course-lesson__name">${lesson.title}</span>
      </h5>
      <p class="course-lesson__desc">${lesson.description}</p>
      <div class="course-lesson__badges">
        <span class="course-lesson__badge course-lesson__badge--danger">
          <i class="fa-regular fa-rectangle-list"></i>
          Отсутствуют тесты
        </span>
        <span class="course-lesson__badge course-lesson__badge--danger">
          <i class="fa-regular fa-file-lines"></i>
          Отсутствуют материалы
        </span>
      </div>
      <div class="course-lesson__actions">
        <button class="btn btn-secondary course-lesson__edit-btn course-lesson__action-btn" data-action="update">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-danger course-lesson__delete-btn course-lesson__action-btn" data-action="delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </li>
  `
}

function moduleRenderer(module, lessons) {
  const moduleLessons = lessons.filter(lesson => module.id === lesson.module_id);
  const lessonsHTML = moduleLessons.map(lesson => lessonRenderer(lesson)).join("");
  console.log(module);
  return `
    <li class="course-module" data-module-id="${module.id}" data-lessons-hidden="true">
          <div class="course-module__header">
            <h4 class="course-module__title">
              <span class="course-module__number">Модуль ${module.module_number}:</span>
              <span class="course-module__name">${module.title}</span>
            </h4>
            <div class="course-module__actions">
              <button class="btn btn-secondary course-module__edit-btn course-module__action-btn" data-action="update">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-danger course-module__delete-btn course-module__action-btn" data-action="delete">
                <i class="fa-solid fa-trash"></i>
              </button>
              <button class="course-module__toggle">
                <i class="fa-solid fa-caret-down"></i>
              </button>
            </div>
          </div>
          <div class="course-lessons">
            <ul class="course-lessons__list">
              ${lessonsHTML}
            </ul>
            <div class="course-lessons__controls">
              <button class="btn btn-primary course-lessons__add-btn" data-action="create" data-entity="lesson">
                Создать урок
              </button>
            </div>
          </div>
        </li>
  `;
}

export default class CoursePage {
  constructor({id}) {
    this.template = null;
    this.id = Number(id);
    this.data = {};
    this.generalForm = null;
    this.modulesContainer = null;
    this.moduleList = null;
    this.modulesHTML = null;
  }

  async fetchData() {
    try {
      this.data = await CourseService.getById(this.id);
      console.log(this.data);
    } catch (error) {
      console.error(error);
    }
  }

  render() {
    this.template = CoursePageTemplate(this.data);
    this.renderModules();
  }

  renderModules() {
    this.modulesHTML = this.data.modules.map(module => moduleRenderer(module, this.data.lessons)).join("");
  }

  mount() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = this.template;
    this.generalForm = componentContainer.querySelector("#course-general-form");
    this.modulesContainer = componentContainer.querySelector(".course-modules__body");
    this.moduleList = componentContainer.querySelector(".course-modules__list");
    this.mountModules();
  }

  mountModules() {
    if (this.modulesHTML && this.moduleList) {
      this.moduleList.innerHTML = this.modulesHTML;
    }
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

    this.generalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(this.generalForm);
      const payload = Object.fromEntries(formData);
      try {
        await CourseService.update(this.id, payload);
        this.data.title = payload.title;
        this.data.description = payload.description;
      } catch (error) {
        console.error(error);
      }
      const formControls = this.generalForm.querySelector(".course__general-form-controls");
      formControls.style.display = "none";
    })

    document.getElementById("module-create-btn").addEventListener("click", async () => {
      const modalInstance = new ModalWithComponent({
        Component: ModuleForm,
        componentProps: {
          containerElementId: "modal-component",
          successHandler: async () => {
            await this.fetchData();
            this.renderModules();
            this.mountModules();
            modalInstance.destroy();
          },
          cancelHandler: () => modalInstance.destroy(),
          courseId: this.id
        }
      });

      await modalInstance.draw();
    });

    this.modulesContainer.addEventListener("click", async (e) => {
      const target = e.target;
      if (!target.closest("[data-action]") && target.closest(".course-module__header")) {
        const moduleContainer = target.closest("[data-module-id]");
        if (!moduleContainer) return;
        moduleContainer.dataset.lessonsHidden = moduleContainer.dataset.lessonsHidden === "true" ? "false" : "true";
      }

      if (target.closest("[data-module-id]") && target.closest('[data-action="update"]') && !target.closest('[data-lesson-id]')) {
        const moduleId = Number(target.closest("[data-module-id]").dataset.moduleId);
        const modalInstance = new ModalWithComponent({
          Component: ModuleForm,
          componentProps: {
            id: moduleId,
            containerElementId: "modal-component",
            successHandler: async () => {
              await this.fetchData();
              this.renderModules();
              this.mountModules();
              modalInstance.destroy();
            },
            cancelHandler: () => modalInstance.destroy(),
          }
        });
        await modalInstance.draw();
      }

      if (target.closest("[data-module-id]") && target.closest('[data-action="delete"]') && !target.closest('[data-lesson-id]')) {
        const moduleContainer = target.closest('[data-module-id]');
        const moduleId = Number(target.closest("[data-module-id]").dataset.moduleId);

        const accept = confirm(`Удалить модуль ${moduleId}?`);
        if (!accept) return;

        const success = await ModuleService.delete(moduleId);
        if (success) {
          moduleContainer.remove();
        }
      }

      if (target.closest("[data-lesson-id]") && target.closest('[data-action="update"]')) {
        const lessonId = Number(target.closest("[data-lesson-id]").dataset.lessonId);
        const modalInstance = new ModalWithComponent({
          Component: LessonForm,
          componentProps: {
            id: lessonId,
            containerElementId: "modal-component",
            successHandler: async () => {
              await this.fetchData();
              this.renderModules();
              this.mountModules();
              modalInstance.destroy();
            },
            cancelHandler: () => modalInstance.destroy(),
          }
        });
        await modalInstance.draw();
      }

      if (target.closest("[data-lesson-id]") && target.closest('[data-action="delete"]')) {
        const lessonContainer = target.closest('[data-lesson-id]');
        const lessonId = Number(lessonContainer.dataset.lessonId);
        const accept = confirm(`Удалить урок ${lessonId}?`)
        if (!accept) return;
        const success = await LessonService.delete(lessonId);
        if (success) {
          lessonContainer.remove();
        }
      }

      if (target.closest('[data-action="create"]') && target.closest('[data-entity="lesson"]')) {
        const moduleId = Number(target.closest('[data-module-id]').dataset.moduleId);
        const modalInstance = new ModalWithComponent({
          Component: LessonForm,
          componentProps: {
            containerElementId: "modal-component",
            successHandler: async () => {
              await this.fetchData();
              this.renderModules();
              this.mountModules();
              modalInstance.destroy();
            },
            cancelHandler: () => modalInstance.destroy(),
            moduleId: moduleId,
            courseId: this.id,
          }
        });
        await modalInstance.draw();
      }
    });
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = "";
  }
}
