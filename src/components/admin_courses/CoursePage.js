import {CoursePageTemplate} from "./CoursePage.template.js";
import ModuleForm from "./ModuleForm";
import LessonForm from "./LessonForm";
import ModalWithComponent from "../common/ModalWithComponent/ModalWithComponent";
import CourseService from "../../services/CourseService";
import ModuleService from "../../services/ModuleService";
import LessonService from "../../services/LessonService";
import ModuleItem from "./ModuleItem.js";

export default class CoursePage {
  constructor({id, pageContainer = null}) {
    this.template = null;
    this.pageContainer = pageContainer;
    this.page = null;
    this.id = Number(id);
    this.data = {};
    this.generalForm = null;
    this.moduleItems = [];
    this.moduleList = null;
  }

  async fetchData() {
    try {
      this.data = await CourseService.getById(this.id);
    } catch (error) {
      console.error(error);
    }
  }

  render() {
    const wrapper = document.createElement("div");
    this.template = CoursePageTemplate(this.data);
    wrapper.innerHTML = this.template;
    this.page = wrapper.querySelector("[data-course-id]");
    this.generalForm = wrapper.querySelector(".course__general-form");
    this.moduleList = wrapper.querySelector(".course-modules__list");
    this._renderModules();
    this.pageContainer = this.pageContainer || document.getElementById("component");
    if (!this.pageContainer) throw new Error("No pageContainer found.");
  }

  mount() {
    this.pageContainer.appendChild(this.page);
    this._mountModules();
  }

  handleEvents() {
    this._handleGeneralForm();

    this.page.addEventListener("click", async (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      switch (action) {
        case "openModule":
          return this._onOpenModule(e);
        case "createModule":
          return await this._onCreateModule(e);
        case "updateModule":
          return await this._onUpdateModule(e);
        case "deleteModule":
          return await this._onDeleteModule(e);

        case "createLesson":
          return await this._onCreateLesson(e);
        case "updateLesson":
          return await this._onUpdateLesson(e);
        case "deleteLesson":
          return await this._onDeleteLesson(e);
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
    this.pageContainer.innerHTML = "";
  }

  async _refreshModulesList() {
    this._clearModulesList();
    await this.fetchData();
    this._renderModules();
    this._mountModules();
  }

  _renderModules() {
    const modules = this.data.modules.map((module) => {
      return {
        ...module,
        lessons: this.data.lessons.filter(lesson => lesson.module_id === module.id),
      }
    });

    this.moduleItems = modules.map(module => {
      const item = new ModuleItem(module);
      item.render();
      return item;
    });
  }

  _mountModules() {
    this.moduleItems.forEach(item => item.mount(this.moduleList));
  }

  _clearModulesList() {
    this.moduleList.innerHTML = "";
  }

  _openModal(Component, props, title) {
    const modal = new ModalWithComponent({
      Component,
      componentProps: {
        ...props,
        successHandler: async () => {
          await this._refreshModulesList();
          modal.destroy();
        },
        cancelHandler: () => modal.destroy()
      },
      title
    });
    return modal.draw();
  }

  _handleGeneralForm() {
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
  }

  _onOpenModule(event) {
    const moduleContainer = event.target.closest("[data-module-id]");
    if (!moduleContainer) return;
    moduleContainer.dataset.lessonsHidden = moduleContainer.dataset.lessonsHidden === "true" ? "false" : "true";
  }

  async _onCreateModule(event) {
    await this._openModal(ModuleForm, {courseId: this.id,}, "Создать модуль");
  }

  async _onUpdateModule(event) {
    const moduleId = Number(event.target.closest("[data-module-id]").dataset.moduleId);
    await this._openModal(ModuleForm, {id: moduleId}, "Изменить модуль");
  }

  async _onDeleteModule(event) {
    const moduleContainer = event.target.closest('[data-module-id]');
    const moduleId = Number(event.target.closest("[data-module-id]").dataset.moduleId);

    const accept = confirm(`Удалить модуль ${moduleId}?`);
    if (!accept) return;

    const success = await ModuleService.delete(moduleId);
    if (success) {
      moduleContainer.remove();
    }
  }

  async _onCreateLesson(event) {
    const moduleId = Number(event.target.closest('[data-module-id]').dataset.moduleId);
    await this._openModal(LessonForm, {moduleId, courseId: this.id}, "Создать урок");
  }

  async _onUpdateLesson(event) {
    const lessonId = Number(event.target.closest("[data-lesson-id]").dataset.lessonId);
    await this._openModal(LessonForm, {id: lessonId}, "Изменить урок");
  }

  async _onDeleteLesson(event) {
    const lessonContainer = event.target.closest('[data-lesson-id]');
    const lessonId = Number(lessonContainer.dataset.lessonId);
    const accept = confirm(`Удалить урок ${lessonId}?`)
    if (!accept) return;
    const success = await LessonService.delete(lessonId);
    if (success) {
      lessonContainer.remove();
    }
  }
}
