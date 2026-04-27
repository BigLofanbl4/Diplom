import ModalWithComponent from "../../../common/ModalWithComponent/ModalWithComponent.js";
import ModuleForm from "../../../admin_courses/forms/ModuleForm/ModuleForm.js";
import LessonForm from "../../../admin_courses/forms/LessonForm/LessonForm.js";
import ModuleItem from "../../../admin_courses/ui/ModuleItem/ModuleItem.js";
import ModuleService from "../../../../services/ModuleService.js";
import LessonService from "../../../../services/LessonService.js";
import TeacherPortalService from "../../../../services/TeacherPortalService.js";
import TestService from "../../../../services/TestService.js";
import { getModuleData } from "../../../../utils/courseUtils.js";
import { showConfirm } from "../../../../utils/dialogs.js";
import { handleAuthenticatedFileLinkClick } from "../../../../utils/fileDownload.js";

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderFileLinks(files = []) {
  if (!files.length) {
    return `<span class="teacher-muted">Файлы не прикреплены</span>`;
  }

  return files.map((file) => `
    <a href="${file.url ?? "#"}" class="teacher-review-card__file" data-auth-download data-download-name="${file.name}">
      <i class="fa-regular fa-file-lines"></i>
      <span>${file.name}</span>
    </a>
  `).join("");
}

function getHomeworkStatusMeta(status, hasSubmission = true) {
  if (!hasSubmission) {
    return {
      label: "Не отправлено",
      className: "teacher-review-card__status--muted",
    };
  }

  switch (status) {
    case "approved":
      return {
        label: "Принято",
        className: "teacher-review-card__status--approved",
      };
    case "needs_revision":
      return {
        label: "Нужна доработка",
        className: "teacher-review-card__status--revision",
      };
    default:
      return {
        label: "Ожидает проверки",
        className: "teacher-review-card__status--pending",
      };
  }
}

function getAttemptStatusMeta(attempt) {
  if (!attempt) {
    return {
      label: "Не проходил",
      className: "teacher-review-card__status--muted",
    };
  }

  if (attempt.is_passed) {
    return {
      label: "Тест пройден",
      className: "teacher-review-card__status--approved",
    };
  }

  return {
    label: "Тест не пройден",
    className: "teacher-review-card__status--revision",
  };
}

function renderLessonSummary(lesson) {
  const homeworkStats = lesson.homework_review ?? {};
  const testStats = lesson.test_review ?? {};

  return `
    <div class="teacher-lesson-summary">
      <div class="teacher-lesson-summary__item">
        <span class="teacher-lesson-summary__label">Домашнее задание</span>
        <strong class="teacher-lesson-summary__value">${homeworkStats.checked_count ?? 0}/${homeworkStats.submitted_count ?? 0} проверено</strong>
        <span class="teacher-lesson-summary__hint">Сдали: ${homeworkStats.submitted_count ?? 0} из ${homeworkStats.total_students ?? 0}</span>
      </div>
      <div class="teacher-lesson-summary__item">
        <span class="teacher-lesson-summary__label">Тест</span>
        <strong class="teacher-lesson-summary__value">${testStats.passed_count ?? 0}/${testStats.total_students ?? 0} прошли</strong>
        <span class="teacher-lesson-summary__hint">Попытка есть у ${testStats.attempted_count ?? 0} студентов</span>
      </div>
    </div>
  `;
}

function renderTeacherLessonActions() {
  return `
    <button class="btn btn-secondary" data-action="viewHomework">Проверить ДЗ</button>
    <button class="btn btn-secondary" data-action="viewTestAttempts">Результаты тестов</button>
  `;
}

class TeacherHomeworkReviewPanel {
  constructor({ groupId, lessonId, containerElement = null }) {
    this.groupId = Number(groupId);
    this.lessonId = Number(lessonId);
    this.containerElement = containerElement;
    this.root = null;
    this.data = null;
    this.boundClickHandler = null;
  }

  async fetchData() {
    this.data = await TeacherPortalService.getLessonHomeworkSubmissions(this.groupId, this.lessonId);
  }

  renderSubmissionItem(item) {
    const statusMeta = getHomeworkStatusMeta(item.submission?.status, Boolean(item.submission));
    const submission = item.submission;

    if (!submission) {
      return `
        <article class="teacher-review-card">
          <div class="teacher-review-card__header">
            <div>
              <h3 class="teacher-review-card__title">${item.student.last_name} ${item.student.first_name}</h3>
            </div>
            <span class="teacher-review-card__status ${statusMeta.className}">${statusMeta.label}</span>
          </div>
          <p class="teacher-review-card__text teacher-muted">Ученик пока не отправлял ответ по этому уроку.</p>
        </article>
      `;
    }

    return `
      <article class="teacher-review-card" data-submission-id="${submission.id}">
        <div class="teacher-review-card__header">
          <div>
            <h3 class="teacher-review-card__title">${item.student.last_name} ${item.student.first_name}</h3>
            <p class="teacher-review-card__meta">Отправлено: ${formatDateTime(submission.created_at)}</p>
          </div>
          <span class="teacher-review-card__status ${statusMeta.className}">${statusMeta.label}</span>
        </div>
        <div class="teacher-review-card__section">
          <strong>Ответ ученика</strong>
          <p class="teacher-review-card__text">${submission.text || "Текстовый ответ не добавлен."}</p>
        </div>
        <div class="teacher-review-card__section">
          <strong>Файлы</strong>
          <div class="teacher-review-card__files">
            ${renderFileLinks(submission.files)}
          </div>
        </div>
        <div class="teacher-review-card__section">
          <label class="form-label" for="homework-status-${submission.id}">Статус проверки</label>
          <select id="homework-status-${submission.id}" name="status" class="form-input">
            <option value="pending" ${submission.status === "pending" ? "selected" : ""}>Ожидает проверки</option>
            <option value="approved" ${submission.status === "approved" ? "selected" : ""}>Принято</option>
            <option value="needs_revision" ${submission.status === "needs_revision" ? "selected" : ""}>Нужна доработка</option>
          </select>
        </div>
        <div class="teacher-review-card__section">
          <label class="form-label" for="homework-feedback-${submission.id}">Комментарий преподавателя</label>
          <textarea id="homework-feedback-${submission.id}" name="feedback" class="form-input" placeholder="Напишите, что нужно поправить или что уже хорошо">${submission.feedback ?? ""}</textarea>
        </div>
        <div class="teacher-review-card__footer">
          <span class="teacher-review-card__meta">
            ${submission.checked_at ? `Проверено: ${formatDateTime(submission.checked_at)}` : "Проверка еще не выполнена"}
          </span>
          <button type="button" class="btn btn-primary" data-action="saveHomeworkReview">Сохранить проверку</button>
        </div>
      </article>
    `;
  }

  renderContent() {
    const stats = this.data?.stats ?? {};
    const items = this.data?.data ?? [];

    this.root.innerHTML = `
      <section class="teacher-review">
        <div class="teacher-review__header">
          <div>
            <span class="teacher-section__eyebrow">Урок ${this.data?.lesson?.lesson_number ?? ""}</span>
            <h2 class="teacher-section__title">${this.data?.lesson?.title ?? "Проверка ДЗ"}</h2>
          </div>
          <div class="teacher-review__stats">
            <span class="teacher-review__stat">Сдали: ${stats.submitted_count ?? 0}/${stats.total_students ?? 0}</span>
            <span class="teacher-review__stat">Проверено: ${stats.checked_count ?? 0}</span>
            <span class="teacher-review__stat">На доработке: ${stats.needs_revision_count ?? 0}</span>
          </div>
        </div>
        <div class="teacher-review__list">
          ${items.map((item) => this.renderSubmissionItem(item)).join("")}
        </div>
      </section>
    `;
  }

  mount() {
    this.root = document.createElement("div");
    this.containerElement.appendChild(this.root);
  }

  handleEvents() {
    this.boundClickHandler = async (event) => {
      if (await handleAuthenticatedFileLinkClick(event)) return;

      const saveButton = event.target.closest('[data-action="saveHomeworkReview"]');
      if (!saveButton) return;

      const card = saveButton.closest("[data-submission-id]");
      const submissionId = Number(card?.dataset.submissionId);
      if (!submissionId) return;

      const status = card.querySelector('[name="status"]')?.value ?? "pending";
      const feedback = card.querySelector('[name="feedback"]')?.value ?? "";

      saveButton.disabled = true;
      try {
        await TeacherPortalService.reviewLessonHomeworkSubmission(this.groupId, this.lessonId, submissionId, {
          status,
          feedback,
        });
        await this.fetchData();
        this.renderContent();
      } finally {
        saveButton.disabled = false;
      }
    };

    this.root.addEventListener("click", this.boundClickHandler);
  }

  async draw() {
    await this.fetchData();
    this.mount();
    this.renderContent();
    this.handleEvents();
  }

  destroy() {
    this.root?.removeEventListener("click", this.boundClickHandler);
    this.root?.remove();
  }
}

class TeacherTestAttemptsPanel {
  constructor({ groupId, lessonId, containerElement = null }) {
    this.groupId = Number(groupId);
    this.lessonId = Number(lessonId);
    this.containerElement = containerElement;
    this.root = null;
    this.data = null;
  }

  async fetchData() {
    this.data = await TeacherPortalService.getLessonTestAttempts(this.groupId, this.lessonId);
  }

  renderAttemptItem(item) {
    const statusMeta = getAttemptStatusMeta(item.attempt);

    return `
      <article class="teacher-review-card">
        <div class="teacher-review-card__header">
          <div>
            <h3 class="teacher-review-card__title">${item.student.last_name} ${item.student.first_name}</h3>
            <p class="teacher-review-card__meta">
              ${item.attempt ? `Последняя попытка: ${formatDateTime(item.attempt.created_at)}` : "Попыток пока нет"}
            </p>
          </div>
          <span class="teacher-review-card__status ${statusMeta.className}">${statusMeta.label}</span>
        </div>
        <div class="teacher-review-card__section">
          <strong>Результат</strong>
          <p class="teacher-review-card__text">
            ${item.attempt ? `${item.attempt.score}/${item.attempt.total}` : "Тест еще не был отправлен"}
          </p>
        </div>
      </article>
    `;
  }

  renderContent() {
    const stats = this.data?.stats ?? {};
    const items = this.data?.data ?? [];

    this.root.innerHTML = `
      <section class="teacher-review">
        <div class="teacher-review__header">
          <div>
            <span class="teacher-section__eyebrow">Урок ${this.data?.lesson?.lesson_number ?? ""}</span>
            <h2 class="teacher-section__title">${this.data?.lesson?.title ?? "Результаты тестов"}</h2>
          </div>
          <div class="teacher-review__stats">
            <span class="teacher-review__stat">Прошли: ${stats.passed_count ?? 0}/${stats.total_students ?? 0}</span>
            <span class="teacher-review__stat">Есть попытка: ${stats.attempted_count ?? 0}</span>
            <span class="teacher-review__stat">Не прошли: ${stats.failed_count ?? 0}</span>
          </div>
        </div>
        <div class="teacher-review__list">
          ${items.map((item) => this.renderAttemptItem(item)).join("")}
        </div>
      </section>
    `;
  }

  mount() {
    this.root = document.createElement("div");
    this.containerElement.appendChild(this.root);
  }

  async draw() {
    await this.fetchData();
    this.mount();
    this.renderContent();
  }

  destroy() {
    this.root?.remove();
  }
}

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
          detailsContent: renderLessonSummary,
          extraActions: renderTeacherLessonActions,
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
        case "viewHomework":
          await this.openHomeworkModal(event);
          return;
        case "viewTestAttempts":
          await this.openTestAttemptsModal(event);
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

  async openHomeworkModal(event) {
    const lessonId = Number(event.target.closest("[data-lesson-id]")?.dataset.lessonId);
    if (!lessonId) return;

    const lesson = this.data.course_instance?.lessons?.find((item) => item.id === lessonId);
    const modal = new ModalWithComponent({
      Component: TeacherHomeworkReviewPanel,
      componentProps: {
        groupId: this.groupId,
        lessonId,
      },
      title: lesson ? `Проверка ДЗ · Урок ${lesson.lesson_number}` : "Проверка ДЗ",
    });

    await modal.draw();
  }

  async openTestAttemptsModal(event) {
    const lessonId = Number(event.target.closest("[data-lesson-id]")?.dataset.lessonId);
    if (!lessonId) return;

    const lesson = this.data.course_instance?.lessons?.find((item) => item.id === lessonId);
    const modal = new ModalWithComponent({
      Component: TeacherTestAttemptsPanel,
      componentProps: {
        groupId: this.groupId,
        lessonId,
      },
      title: lesson ? `Результаты теста · Урок ${lesson.lesson_number}` : "Результаты тестов",
    });

    await modal.draw();
  }

  async deleteModule(event) {
    const groupCourseId = this.data.course_instance?.id;
    const moduleId = Number(event.target.closest("[data-module-id]")?.dataset.moduleId);
    if (!groupCourseId || !moduleId) return;

    const accept = await showConfirm({
      title: "Удаление модуля",
      message: `Удалить модуль ${moduleId}?`,
      confirmText: "Удалить",
    });
    if (!accept) return;

    await ModuleService.delete(groupCourseId, moduleId);
    await this.reload();
  }

  async deleteLesson(event) {
    const groupCourseId = this.data.course_instance?.id;
    const lessonId = Number(event.target.closest("[data-lesson-id]")?.dataset.lessonId);
    if (!groupCourseId || !lessonId) return;

    const accept = await showConfirm({
      title: "Удаление урока",
      message: `Удалить урок ${lessonId}?`,
      confirmText: "Удалить",
    });
    if (!accept) return;

    await LessonService.delete(groupCourseId, lessonId);
    await this.reload();
  }

  async deleteTest(event) {
    const groupCourseId = this.data.course_instance?.id;
    const lessonId = Number(event.target.closest("[data-lesson-id]")?.dataset.lessonId);
    if (!groupCourseId || !lessonId) return;

    const accept = await showConfirm({
      title: "Удаление теста",
      message: `Удалить тест у урока ${lessonId}?`,
      confirmText: "Удалить",
    });
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
