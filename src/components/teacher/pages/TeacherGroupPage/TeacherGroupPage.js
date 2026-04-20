import ModalWithComponent from "../../../common/ModalWithComponent/ModalWithComponent.js";
import ModuleForm from "../../../admin_courses/forms/ModuleForm/ModuleForm.js";
import LessonForm from "../../../admin_courses/forms/LessonForm/LessonForm.js";
import ModuleItem from "../../../admin_courses/ui/ModuleItem/ModuleItem.js";
import ModuleService from "../../../../services/ModuleService.js";
import LessonService from "../../../../services/LessonService.js";
import TeacherPortalService from "../../../../services/TeacherPortalService.js";
import TestService from "../../../../services/TestService.js";
import { getModuleData } from "../../../../utils/courseUtils.js";

export default class TeacherGroupPage {
  constructor({ groupId }) {
    this.groupId = Number(groupId);
    this.data = null;
    this.page = null;
    this.moduleList = null;
    this.boundClickHandler = null;
  }

  async fetchData() {
    this.data = await TeacherPortalService.getMyGroupById(this.groupId);
  }

  render() {
    const groupCourse = this.data.course_instance;
    const modulesCount = groupCourse?.modules?.length ?? 0;
    const lessonsCount = groupCourse?.lessons?.length ?? 0;
    const templateLimit = this.data.course_template?.max_modules_count ?? 0;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="teacher-page teacher-group-page" data-group-id="${this.data.id}">
        <div class="teacher-page__topbar">
          <a href="/teacher" class="btn btn-secondary" data-spa-link>
            <i class="fa-solid fa-arrow-left"></i>
            <span>К группам</span>
          </a>
        </div>

        <div class="page-hero teacher-page__hero">
          <div class="page-hero__main">
            <span class="page-hero__eyebrow">Группа ${this.data.group_number}</span>
            <h1 class="page-hero__title">${this.data.course_template?.title ?? "Курс не назначен"}</h1>
            <p class="page-hero__description">
              Курс этой группы работает отдельно от шаблона. Все изменения преподавателя сохраняются только внутри группы.
            </p>
          </div>
          <div class="page-hero__meta">
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Студентов</span>
              <strong class="page-hero__meta-value">${this.data.students_count}</strong>
            </div>
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Модулей в курсе</span>
              <strong class="page-hero__meta-value">${modulesCount}/${templateLimit}</strong>
            </div>
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Уроков</span>
              <strong class="page-hero__meta-value">${lessonsCount}</strong>
            </div>
          </div>
        </div>

        <section class="teacher-section">
          <div class="teacher-section__header teacher-section__header--between">
            <div>
              <span class="teacher-section__eyebrow">Состав группы</span>
              <h2 class="teacher-section__title">Студенты</h2>
            </div>
          </div>
          <div class="teacher-chip-list">
            ${(this.data.students ?? []).map((student) => `<span class="table__chip">${student.last_name} ${student.first_name}</span>`).join("") || `<span class="teacher-muted">Студенты пока не добавлены</span>`}
          </div>
        </section>

        <section class="course-modules">
          <div class="course-modules__header">
            <div>
              <span class="course-modules__eyebrow">Курс группы</span>
              <h2>Модули и проведенные уроки</h2>
              <p class="teacher-section__description">
                Если номер урока найден в шаблоне, тест, материалы и домашнее задание копируются автоматически.
              </p>
            </div>
            <button class="btn btn-primary course-modules__add-btn" data-action="createModule" ${!groupCourse ? "disabled" : ""}>
              <i class="fa-solid fa-plus"></i>
              <span>Создать модуль</span>
            </button>
          </div>
          <div class="course-modules__body">
            <ul class="course-modules__list" data-module-list></ul>
          </div>
        </section>
      </section>
    `;

    this.page = wrapper.firstElementChild;
    this.moduleList = this.page.querySelector("[data-module-list]");
    this.renderModules();
  }

  renderModules() {
    if (!this.moduleList) return;
    this.moduleList.innerHTML = "";

    const groupCourse = this.data.course_instance;
    const modules = groupCourse ? getModuleData(groupCourse) : [];

    if (modules.length === 0) {
      const emptyState = document.createElement("li");
      emptyState.className = "course-module course-module--empty";
      emptyState.innerHTML = `
        <div class="teacher-empty-state">
          <h3 class="teacher-empty-state__title">Курс группы пока не подготовлен</h3>
          <p class="teacher-empty-state__text">Создайте первый модуль по номеру из шаблона, и дальше можно будет добавлять уроки.</p>
        </div>
      `;
      this.moduleList.appendChild(emptyState);
      return;
    }

    modules.forEach((moduleData) => {
      const item = new ModuleItem(moduleData, {
        lessonCardOptions: {
          testHref: (lesson) => `/teacher/groups/${this.groupId}/courses/${this.data.course_instance.id}/lessons/${lesson.id}/test`,
        },
      });
      this.moduleList.appendChild(item.render());
    });
  }

  mount() {
    document.getElementById("component").appendChild(this.page);
  }

  handleEvents() {
    this.boundClickHandler = async (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;

      switch (action) {
        case "openModule":
          this.toggleModule(event);
          return;
        case "createModule":
          await this.openModuleModal();
          return;
        case "updateModule":
          await this.openModuleModal(event);
          return;
        case "deleteModule":
          await this.deleteModule(event);
          return;
        case "createLesson":
          await this.openLessonModal(event);
          return;
        case "updateLesson":
          await this.openLessonModal(event);
          return;
        case "deleteLesson":
          await this.deleteLesson(event);
          return;
        case "deleteTest":
          await this.deleteTest(event);
          return;
        default:
          return;
      }
    };

    this.page.addEventListener("click", this.boundClickHandler);
  }

  toggleModule(event) {
    const moduleContainer = event.target.closest("[data-module-id]");
    if (!moduleContainer) return;
    moduleContainer.dataset.lessonsHidden = moduleContainer.dataset.lessonsHidden === "true" ? "false" : "true";
  }

  async openModuleModal(event = null) {
    const groupCourseId = this.data.course_instance?.id;
    if (!groupCourseId) return;

    const moduleId = event ? Number(event.target.closest("[data-module-id]")?.dataset.moduleId) : null;
    const modal = new ModalWithComponent({
      Component: ModuleForm,
      componentProps: {
        id: moduleId,
        courseId: groupCourseId,
        allowTemplateAutofill: true,
        successHandler: async () => {
          modal.destroy();
          await this.reload();
        },
        cancelHandler: () => modal.destroy(),
      },
      title: moduleId ? "Изменить модуль" : "Создать модуль",
    });

    await modal.draw();
  }

  async openLessonModal(event) {
    const groupCourseId = this.data.course_instance?.id;
    if (!groupCourseId) return;

    const moduleId = Number(event.target.closest("[data-module-id]")?.dataset.moduleId);
    const lessonId = event.target.closest("[data-lesson-id]")?.dataset.lessonId
      ? Number(event.target.closest("[data-lesson-id]")?.dataset.lessonId)
      : null;

    const modal = new ModalWithComponent({
      Component: LessonForm,
      componentProps: {
        id: lessonId,
        moduleId: lessonId ? null : moduleId,
        courseId: groupCourseId,
        allowTemplateAutofill: true,
        successHandler: async () => {
          modal.destroy();
          await this.reload();
        },
        cancelHandler: () => modal.destroy(),
      },
      title: lessonId ? "Изменить урок" : "Создать урок",
    });

    await modal.draw();
  }

  async deleteModule(event) {
    const groupCourseId = this.data.course_instance?.id;
    const moduleId = Number(event.target.closest("[data-module-id]")?.dataset.moduleId);
    if (!groupCourseId || !moduleId) return;

    const accept = confirm(`Удалить модуль ${moduleId}?`);
    if (!accept) return;

    await ModuleService.delete(groupCourseId, moduleId);
    await this.reload();
  }

  async deleteLesson(event) {
    const groupCourseId = this.data.course_instance?.id;
    const lessonId = Number(event.target.closest("[data-lesson-id]")?.dataset.lessonId);
    if (!groupCourseId || !lessonId) return;

    const accept = confirm(`Удалить урок ${lessonId}?`);
    if (!accept) return;

    await LessonService.delete(groupCourseId, lessonId);
    await this.reload();
  }

  async deleteTest(event) {
    const groupCourseId = this.data.course_instance?.id;
    const lessonId = Number(event.target.closest("[data-lesson-id]")?.dataset.lessonId);
    if (!groupCourseId || !lessonId) return;

    const accept = confirm(`Удалить тест у урока ${lessonId}?`);
    if (!accept) return;

    await TestService.delete(groupCourseId, lessonId);
    await this.reload();
  }

  async reload() {
    this.destroy();
    await this.draw();
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    this.page?.removeEventListener("click", this.boundClickHandler);
    this.page?.remove();
    this.page = null;
    this.moduleList = null;
  }
}
