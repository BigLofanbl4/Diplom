import {CoursePageTemplate} from "./CoursePage.template.js";
import ModuleForm from "../../forms/ModuleForm/ModuleForm.js";
import LessonForm from "../../forms/LessonForm/LessonForm.js";
import ModalWithComponent from "../../../common/ModalWithComponent/ModalWithComponent.js";
import CourseService from "../../../../services/CourseService.js";
import ModuleService from "../../../../services/ModuleService.js";
import LessonService from "../../../../services/LessonService.js";
import ModuleItem from "../../ui/ModuleItem/ModuleItem.js";
import LessonCard from "../../ui/LessonCard/LessonCard.js";
import {getModuleData} from "../../../../utils/courseUtils.js";
import TestService from "../../../../services/TestService.js";

class ModuleController {
  constructor(courseId, getData, moduleList, _openModal) {
    this.courseId = courseId;
    this.getData = getData;
    this.moduleItems = null;
    this.moduleList = moduleList;
    this._openModal = _openModal;
  }

  renderModules() {
    const modulesData = getModuleData(this.getData());
    this.moduleItems = modulesData.map(module => {
      const item = new ModuleItem(module);
      item.render();
      return item;
    });
  }

  mountModules() {
    if (!this.moduleList) throw new Error('Modules container is undefined');
    if (!this.moduleItems) this.renderModules();
    this.moduleItems.forEach(item => item.mount(this.moduleList));
  }

  clearModulesList() {
    this.moduleList.innerHTML = "";
  }

  refreshModulesList() {
    this.clearModulesList();
    this.renderModules();
    this.mountModules();
  }

  destroy() {
    this.clearModulesList();
  }

  canHandle(action) {
    return ["createModule", "updateModule", "deleteModule", "openModule"].includes(action);
  }

  async handle(action, event) {
    switch(action) {
      case "createModule": return await this._onCreateModule(event);
      case "updateModule": return await this._onUpdateModule(event);
      case "deleteModule": return await this._onDeleteModule(event);
      case "openModule": return this._onOpenModule(event);
    }
  }

  addModule(module) {
    const data = this.getData();
    data.modules.push(module);
    const moduleData = { ...module, lessons: [] }
    const newModuleItem = new ModuleItem(moduleData);
    newModuleItem.render();
    this.moduleItems.push(newModuleItem);
    newModuleItem.mount(this.moduleList);
  }

  updateModule(updatedModule) {
    if (!updatedModule?.id) return;
    const data = this.getData();
    const idx = data.modules.findIndex(m => m.id === updatedModule.id);
    if (idx === -1) return;
    data.modules[idx] = {...data.modules[idx], ...updatedModule};

    const oldEl = this.moduleList.querySelector(`[data-module-id="${updatedModule.id}"]`);
    if (!oldEl) return;
    const modulesData = getModuleData(this.getData());
    const moduleData = modulesData.find(m => m.id === updatedModule.id);
    if (!moduleData) return;
    const newItem = new ModuleItem(moduleData);
    const newEl = newItem.render();
    newEl.dataset.lessonsHidden = oldEl.dataset.lessonsHidden;
    oldEl.replaceWith(newEl);
  }

  _onOpenModule(event) {
    const moduleContainer = event.target.closest("[data-module-id]");
    if (!moduleContainer) return;
    moduleContainer.dataset.lessonsHidden = moduleContainer.dataset.lessonsHidden === "true" ? "false" : "true";
  }

  async _onCreateModule(event) {
    await this._openModal(ModuleForm, {courseId: this.courseId,}, "Создать модуль", (module) => this.addModule(module));
  }

  async _onUpdateModule(event) {
    const moduleId = Number(event.target.closest("[data-module-id]").dataset.moduleId);
    await this._openModal(
      ModuleForm,
      {id: moduleId, courseId: this.courseId},
      "Изменить модуль",
      (module) => this.updateModule(module)
    );
  }

  async _onDeleteModule(event) {
    const moduleContainer = event.target.closest('[data-module-id]');
    const moduleId = Number(event.target.closest("[data-module-id]").dataset.moduleId);

    const accept = confirm(`Удалить модуль ${moduleId}?`);
    if (!accept) return;

    const success = await ModuleService.delete(this.courseId, moduleId);
    if (success) {
      const data = this.getData();
      data.modules = data.modules.filter(m => m.id !== moduleId);
      data.lessons = data.lessons.filter(l => l.module_id !== moduleId);
      moduleContainer.remove();
    }
  }
}

class LessonController {
  constructor(courseId, getData, _openModal) {
    this.courseId = courseId;
    this.getData = getData;
    this._openModal = _openModal;
  }

  canHandle(action) {
    return ["createLesson", "updateLesson", "deleteLesson", "deleteTest"].includes(action);
  }

  async handle(action, event) {
    switch (action) {
      case "createLesson": return await this._onCreateLesson(event);
      case "updateLesson": return await this._onUpdateLesson(event);
      case "deleteLesson": return await this._onDeleteLesson(event);
      case "deleteTest": return await this._onDeleteLessonTest(event);
    }
  }

  addLesson(lesson, container) {
    const data = this.getData();
    data.lessons.push(lesson);
    const empty = container.querySelector(".course-lesson--empty");
    if (empty) empty.remove();
    const lessonCard = new LessonCard(lesson);
    lessonCard.mount(container);
  }

  updateLesson(updatedLesson) {
    if (!updatedLesson?.id) return;
    const data = this.getData();
    const idx = data.lessons.findIndex(l => l.id === updatedLesson.id);
    if (idx === -1) return;
    data.lessons[idx] = {...data.lessons[idx], ...updatedLesson};

    const oldEl = document.querySelector(`[data-lesson-id="${updatedLesson.id}"]`);
    if (!oldEl) return;
    const newCard = new LessonCard(updatedLesson);
    const newEl = newCard.render();
    oldEl.replaceWith(newEl);
  }

  async _onCreateLesson(event) {
    const moduleContainer = event.target.closest('[data-module-id]');
    const lessonsList = moduleContainer.querySelector('[data-module-lessons]');
    const moduleId = Number(moduleContainer.dataset.moduleId);
    await this._openModal(LessonForm, {moduleId, courseId: this.courseId}, "Создать урок", (lesson) => this.addLesson(lesson, lessonsList));
  }

  async _onUpdateLesson(event) {
    const lessonId = Number(event.target.closest("[data-lesson-id]").dataset.lessonId);
    await this._openModal(
      LessonForm,
      {id: lessonId, courseId: this.courseId},
      "Изменить урок",
      (lesson) => this.updateLesson(lesson)
    );
  }

  async _onDeleteLesson(event) {
    const lessonContainer = event.target.closest('[data-lesson-id]');
    const lessonId = Number(lessonContainer.dataset.lessonId);
    const accept = confirm(`Удалить урок ${lessonId}?`)
    if (!accept) return;
    const success = await LessonService.delete(this.courseId, lessonId);
    if (success) {
      const moduleContainer = event.target.closest("[data-module-id]");
      const lessonsList = moduleContainer?.querySelector("[data-module-lessons]");
      const remaining = lessonsList?.querySelectorAll("[data-lesson-id]")?.length ?? 0;
      if (remaining === 1 && lessonsList) {
        const empty = document.createElement("li");
        empty.classList.add("course-lesson", "course-lesson--empty");
        empty.textContent = "Уроков пока нет";
        lessonsList.appendChild(empty);
      }
      const data = this.getData();
      data.lessons = data.lessons.filter(l => l.id !== lessonId);
      lessonContainer.remove();
    }
  }

  async _onDeleteLessonTest(event) {
    const lessonContainer = event.target.closest('[data-lesson-id]');
    const lessonId = Number(lessonContainer.dataset.lessonId);
    const accept = confirm(`Удалить тест у урока ${lessonId}`);
    if (!accept) return;

    try {
      const success = await TestService.delete(this.courseId, lessonId);
      if (success) {
        alert("Тест удален!");
        const data = this.getData();
        const targetLessonData = data.lessons.find(l => l.id === lessonId);
        if (!targetLessonData) return;
        targetLessonData.test_id = null;
        this._refreshLessonCard(targetLessonData, lessonContainer);
        return success;
      }
    } catch (error) {
      alert("Возникла ошибка при удалении теста!");
      console.error(error);
    }
  }

  _refreshLessonCard(lessonData, lessonContainer) {
    const lessonCard = new LessonCard(lessonData);
    lessonContainer.replaceWith(lessonCard.render());
  }
}


export default class CoursePage {
  constructor({id, pageContainer = null}) {
    this.template = null;
    this.pageContainer = pageContainer;
    this.page = null;
    this.id = Number(id);
    this.data = {};
    this.generalForm = null;
    this.moduleList = null;

    this.lessonController = null;
    this.moduleController = null;

    this.boundPageClick = null;
    this.boundGeneralInput = null;
    this.boundGeneralSubmit = null;
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
    this.pageContainer = this.pageContainer || document.getElementById("component");
    if (!this.pageContainer) throw new Error("No pageContainer found.");
  }

  mount() {
    this.pageContainer.appendChild(this.page);
    this.moduleController.mountModules(this.moduleList);
  }

  handleEvents() {
    this._handleGeneralForm();

    this.boundPageClick = async (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (this.moduleController.canHandle(action)) {
        return await this.moduleController.handle(action, e);
      }

      if (this.lessonController.canHandle(action)) {
        return await this.lessonController.handle(action, e);
      }
    }

    this.page.addEventListener("click", this.boundPageClick);
  }

  async draw() {
    await this.fetchData();
    this.render();
    this._initControllers();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    this.page?.removeEventListener("click", this.boundPageClick);
    this.generalForm?.removeEventListener("input", this.boundGeneralInput);
    this.generalForm?.removeEventListener("submit", this.boundGeneralSubmit);
    if (this.page) this.page.remove();
  }

  _initControllers() {
    const getData = () => this.data;
    this.moduleController = new ModuleController(this.id, getData, this.moduleList, this._openModal.bind(this));
    this.lessonController = new LessonController(this.id, getData, this._openModal.bind(this));
  }

  _openModal(Component, props, title, onSuccess) {
    const modal = new ModalWithComponent({
      Component,
      componentProps: {
        ...props,
        successHandler: async (entity) => {
          onSuccess?.(entity);
          modal.destroy();
        },
        cancelHandler: () => modal.destroy()
      },
      title
    });
    return modal.draw();
  }

  _handleGeneralForm() {
    this.boundGeneralInput = () => {
      const formControls = this.generalForm.querySelector(".course__general-form-controls");
      if (!formControls) return;
      const formFields = Array.from(this.generalForm.elements).filter(e => e.name !== "");
      const same = formFields.every(field => this.data[field.name] === field.value);
      if (!same) {
        formControls.style.display = "flex";
      } else {
        formControls.style.display = "none";
      }
    }

    this.boundGeneralSubmit = async (e) => {
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
    }

    this.generalForm.addEventListener("input", this.boundGeneralInput);
    this.generalForm.addEventListener("submit", this.boundGeneralSubmit);
  }
}
