import StudentPortalService from "../../../../services/StudentPortalService.js";

function renderCourseCard(course) {
  return `
    <article class="student-course-card">
      <div class="student-course-card__header">
        <div>
          <span class="student-course-card__eyebrow">Группа ${course.group.group_number}</span>
          <h3 class="student-course-card__title">${course.title}</h3>
        </div>
      </div>
      <p class="student-course-card__description">${course.description ?? "Описание курса пока не добавлено."}</p>
      <div class="student-course-card__meta">
        <span class="student-course-card__badge">Модулей: ${course.modules_count}</span>
        <span class="student-course-card__badge">Уроков: ${course.lessons_count}</span>
      </div>
      <div class="student-course-card__actions">
        <a href="/student/courses/${course.id}" class="btn btn-primary" data-spa-link>Открыть курс</a>
      </div>
    </article>
  `;
}

export default class StudentDashboard {
  constructor() {
    this.data = [];
    this.page = null;
  }

  async fetchData() {
    const response = await StudentPortalService.getMyCourses();
    this.data = response.data;
  }

  render() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="teacher-page student-page">
        <div class="page-hero teacher-page__hero">
          <div class="page-hero__main">
            <span class="page-hero__eyebrow">Кабинет ученика</span>
            <h1 class="page-hero__title">Мои курсы</h1>
            <p class="page-hero__description">
              Здесь собраны все курсы, доступные вам по группам. Внутри каждого курса можно смотреть материалы, сдавать домашние задания и проходить тесты.
            </p>
          </div>
        </div>
        <section class="teacher-section">
          <div class="student-course-grid">
            ${this.data.length > 0
              ? this.data.map(renderCourseCard).join("")
              : `<div class="teacher-empty-state"><h3 class="teacher-empty-state__title">Курсы пока не назначены</h3><p class="teacher-empty-state__text">Когда вас добавят в учебную группу, курсы появятся здесь.</p></div>`}
          </div>
        </section>
      </section>
    `;
    this.page = wrapper.firstElementChild;
  }

  mount() {
    document.getElementById("component").appendChild(this.page);
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
  }

  destroy() {
    this.page?.remove();
  }
}
