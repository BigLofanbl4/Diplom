import ModalWithComponent from "../../../common/ModalWithComponent/ModalWithComponent.js";
import FileDropzoneController from "../../../common/FileDropzone/FileDropzoneController.js";
import StudentPortalService from "../../../../services/StudentPortalService.js";
import { getModuleData } from "../../../../utils/courseUtils.js";

class HomeworkSubmissionForm {
  constructor({ lesson, courseId, onSuccess = null, onCancel = null, containerElement = null }) {
    this.lesson = lesson;
    this.courseId = courseId;
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
    this.containerElement = containerElement;
    this.form = null;
    this.root = null;
    this.boundSubmitHandler = null;
    this.boundClickHandler = null;
    this.filesController = null;
  }

  render() {
    const existingSubmission = this.lesson.homework_submission;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <form class="form student-homework-form">
        <div class="form-group">
          <label class="form-label" for="student-homework-text">Текст ответа</label>
          <textarea id="student-homework-text" name="text" class="form-input" placeholder="Напишите ответ или комментарий к файлам">${existingSubmission?.text ?? ""}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="student-homework-files">Файлы</label>
          <div class="form-file-dropzone" data-drop-zone>
            <span class="form-file-dropzone-hint" data-hidden="false" data-drop-hint>Перетяните файлы или кликните на кнопку</span>
            <ul class="form-file-list" aria-live="polite" data-drop-file-list></ul>
          </div>
          <label class="form-file-select-btn btn btn-primary" for="student-homework-files">
            Выберите файлы
          </label>
          <input id="student-homework-files" name="files" type="file" class="form-file-input" multiple data-files-input>
        </div>
        <div class="teacher-form-actions">
          <button type="button" class="btn btn-secondary" data-action="cancel">Отмена</button>
          <button type="submit" class="btn btn-primary">Отправить</button>
        </div>
      </form>
    `;

    this.root = wrapper.firstElementChild;
    this.form = this.root;
  }

  mount() {
    this.containerElement.appendChild(this.root);
  }

  initCustomFields() {
    const dropZone = this.form.querySelector("[data-drop-zone]");
    const dropInput = this.form.querySelector("[data-files-input]");
    const dropList = this.form.querySelector("[data-drop-file-list]");
    const dropHint = this.form.querySelector("[data-drop-hint]");
    if (!dropZone || !dropInput || !dropList) return;

    this.filesController = new FileDropzoneController({
      inputEl: dropInput,
      dropzoneEl: dropZone,
      listEl: dropList,
      hintEl: dropHint,
    });
  }

  handleEvents() {
    this.boundClickHandler = (event) => {
      if (event.target.closest('[data-action="cancel"]')) {
        this.onCancel?.();
      }
    };

    this.boundSubmitHandler = async (event) => {
      event.preventDefault();
      const files = this.filesController?.getLocalFiles() ?? [];
      const text = this.form.querySelector('[name="text"]').value;
      const result = await StudentPortalService.submitHomework(this.courseId, this.lesson.id, { text, files });
      this.onSuccess?.(result);
    };

    this.form.addEventListener("click", this.boundClickHandler);
    this.form.addEventListener("submit", this.boundSubmitHandler);
    this.filesController?.handleEvents();
  }

  async draw() {
    this.render();
    this.mount();
    this.initCustomFields();
    this.handleEvents();
  }

  destroy() {
    this.form?.removeEventListener("click", this.boundClickHandler);
    this.form?.removeEventListener("submit", this.boundSubmitHandler);
    this.filesController?.destroy();
    this.root?.remove();
  }
}

function renderMaterialLink(material) {
  return `<a href="${material.url ?? "#"}" class="student-lesson-card__file" target="_blank" rel="noreferrer">${material.name}</a>`;
}

function renderLessonCard(courseId, lesson) {
  const submission = lesson.homework_submission;
  const latestAttempt = lesson.latest_test_attempt;

  return `
    <li class="student-lesson-card">
      <div class="student-lesson-card__header">
        <div>
          <span class="student-lesson-card__eyebrow">Урок ${lesson.lesson_number}</span>
          <h4 class="student-lesson-card__title">${lesson.title}</h4>
        </div>
      </div>
      <p class="student-lesson-card__description">${lesson.description ?? "Описание урока пока не добавлено."}</p>
      <div class="student-lesson-card__section">
        <strong>Домашнее задание</strong>
        <p>${lesson.homework_text ?? "Домашнее задание пока не указано."}</p>
      </div>
      <div class="student-lesson-card__section">
        <strong>Файлы урока</strong>
        <div class="student-lesson-card__files">
          ${lesson.materials?.length ? lesson.materials.map(renderMaterialLink).join("") : `<span class="teacher-muted">Материалов пока нет</span>`}
        </div>
      </div>
      <div class="student-lesson-card__section">
        <strong>Тест</strong>
        <p>${lesson.test_id ? "Тест доступен для прохождения." : "Для этого урока тест не прикреплен."}</p>
        ${latestAttempt ? `<span class="student-lesson-card__badge">Последний результат: ${latestAttempt.score}/${latestAttempt.total}</span>` : ""}
      </div>
      <div class="student-lesson-card__section">
        <strong>Ответ на ДЗ</strong>
        <p>${submission?.text || "Ответ пока не отправлен."}</p>
        <div class="student-lesson-card__files">
          ${submission?.files?.length ? submission.files.map(renderMaterialLink).join("") : ""}
        </div>
      </div>
      <div class="student-lesson-card__actions">
        ${lesson.test_id ? `<a href="/student/courses/${courseId}/lessons/${lesson.id}/test" class="btn btn-secondary" data-spa-link>Пройти тест</a>` : ""}
        <button class="btn btn-primary" data-action="submit-homework" data-lesson-id="${lesson.id}">Отправить ДЗ</button>
      </div>
    </li>
  `;
}

function renderModule(module, courseId) {
  return `
    <section class="student-module">
      <div class="student-module__header">
        <h3 class="student-module__title">Модуль ${module.module_number}: ${module.title}</h3>
      </div>
      <ul class="student-lesson-list">
        ${module.lessons.length > 0
          ? module.lessons.map((lesson) => renderLessonCard(courseId, lesson)).join("")
          : `<li class="teacher-muted">Уроков пока нет</li>`}
      </ul>
    </section>
  `;
}

export default class StudentCoursePage {
  constructor({ courseId }) {
    this.courseId = Number(courseId);
    this.data = null;
    this.page = null;
    this.boundClickHandler = null;
  }

  async fetchData() {
    this.data = await StudentPortalService.getMyCourseById(this.courseId);
  }

  render() {
    const modules = getModuleData(this.data);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="teacher-page student-page">
        <div class="teacher-page__topbar">
          <a href="/student" class="btn btn-secondary" data-spa-link>
            <i class="fa-solid fa-arrow-left"></i>
            <span>К моим курсам</span>
          </a>
        </div>
        <div class="page-hero teacher-page__hero">
          <div class="page-hero__main">
            <span class="page-hero__eyebrow">Курс</span>
            <h1 class="page-hero__title">${this.data.title}</h1>
            <p class="page-hero__description">${this.data.description ?? "Описание курса пока не добавлено."}</p>
          </div>
        </div>
        <div class="student-module-list">
          ${modules.map((module) => renderModule(module, this.courseId)).join("")}
        </div>
      </section>
    `;
    this.page = wrapper.firstElementChild;
  }

  mount() {
    document.getElementById("component").appendChild(this.page);
  }

  handleEvents() {
    this.boundClickHandler = async (event) => {
      const submitButton = event.target.closest('[data-action="submit-homework"]');
      if (!submitButton) return;

      const lessonId = Number(submitButton.dataset.lessonId);
      const lesson = this.data.lessons.find((item) => item.id === lessonId);
      if (!lesson) return;

      const modal = new ModalWithComponent({
        Component: HomeworkSubmissionForm,
        componentProps: {
          lesson,
          courseId: this.courseId,
          onSuccess: async () => {
            modal.destroy();
            await this.reload();
          },
          onCancel: () => modal.destroy(),
        },
        title: "Отправить домашнее задание",
      });

      await modal.draw();
    };

    this.page.addEventListener("click", this.boundClickHandler);
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
  }
}
