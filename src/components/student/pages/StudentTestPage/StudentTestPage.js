import StudentPortalService from "../../../../services/StudentPortalService.js";

function normalizeOption(option) {
  if (option && typeof option === "object") {
    return {
      value: String(option.value ?? option.text ?? ""),
      label: String(option.text ?? option.value ?? ""),
    };
  }

  return {
    value: String(option ?? ""),
    label: String(option ?? ""),
  };
}

function renderQuestion(question) {
  if (question.type === "single_choice") {
    return `
      <div class="student-test-question__options">
        ${(question.options ?? []).map((rawOption) => {
          const option = normalizeOption(rawOption);
          return `
          <label class="student-test-question__option">
            <input type="radio" name="question-${question.id}" value="${option.value}">
            <span>${option.label}</span>
          </label>
        `;
        }).join("")}
      </div>
    `;
  }

  if (question.type === "multiple_choice") {
    return `
      <div class="student-test-question__options">
        ${(question.options ?? []).map((rawOption) => {
          const option = normalizeOption(rawOption);
          return `
          <label class="student-test-question__option">
            <input type="checkbox" name="question-${question.id}" value="${option.value}">
            <span>${option.label}</span>
          </label>
        `;
        }).join("")}
      </div>
    `;
  }

  return `<textarea class="form-input" name="question-${question.id}" placeholder="Введите ответ"></textarea>`;
}

export default class StudentTestPage {
  constructor({ courseId, lessonId }) {
    this.courseId = Number(courseId);
    this.lessonId = Number(lessonId);
    this.data = null;
    this.page = null;
    this.form = null;
    this.boundSubmitHandler = null;
  }

  async fetchData() {
    this.data = await StudentPortalService.getMyLessonTest(this.courseId, this.lessonId);
  }

  render() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="teacher-page student-page">
        <div class="teacher-page__topbar">
          <a href="/student/courses/${this.courseId}" class="btn btn-secondary" data-spa-link>
            <i class="fa-solid fa-arrow-left"></i>
            <span>К курсу</span>
          </a>
        </div>
        <div class="page-hero teacher-page__hero">
          <div class="page-hero__main">
            <span class="page-hero__eyebrow">Тест</span>
            <h1 class="page-hero__title">${this.data.title}</h1>
            <p class="page-hero__description">
              Ответьте на вопросы и отправьте попытку. ${this.data.latest_attempt ? `Последний результат: ${this.data.latest_attempt.score}/${this.data.latest_attempt.total}.` : ""}
            </p>
          </div>
        </div>

        <form class="teacher-section student-test-form">
          ${this.data.questions.map((question) => `
            <section class="student-test-question">
              <div class="student-test-question__header">
                <span class="student-test-question__number">Вопрос ${question.number}</span>
                <h3 class="student-test-question__title">${question.text}</h3>
              </div>
              ${renderQuestion(question)}
            </section>
          `).join("")}
          <div class="teacher-form-actions">
            <button type="submit" class="btn btn-primary">Отправить тест</button>
          </div>
        </form>
      </section>
    `;

    this.page = wrapper.firstElementChild;
    this.form = this.page.querySelector("form");
  }

  mount() {
    document.getElementById("component").appendChild(this.page);
  }

  handleEvents() {
    this.boundSubmitHandler = async (event) => {
      event.preventDefault();

      const answers = {};
      this.data.questions.forEach((question) => {
        if (question.type === "multiple_choice") {
          answers[question.id] = Array.from(this.form.querySelectorAll(`input[name="question-${question.id}"]:checked`))
            .map((input) => input.value);
          return;
        }

        if (question.type === "single_choice") {
          answers[question.id] = this.form.querySelector(`input[name="question-${question.id}"]:checked`)?.value ?? "";
          return;
        }

        answers[question.id] = this.form.querySelector(`[name="question-${question.id}"]`)?.value ?? "";
      });

      const result = await StudentPortalService.submitLessonTest(this.courseId, this.lessonId, answers);
      alert(`Тест отправлен. Результат: ${result.score}/${result.total}`);
      await window.router.navigate(`/student/courses/${this.courseId}`);
    };

    this.form.addEventListener("submit", this.boundSubmitHandler);
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    this.form?.removeEventListener("submit", this.boundSubmitHandler);
    this.page?.remove();
  }
}
