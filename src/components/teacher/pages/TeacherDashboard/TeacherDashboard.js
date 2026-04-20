import TeacherPortalService from "../../../../services/TeacherPortalService.js";
import { getAuthUser } from "../../../../core/auth/state.js";

function renderGroupCard(group) {
  const templateTitle = group.course_template?.title ?? "Курс не назначен";
  const courseStatus = group.has_course_instance ? "Курс группы уже подготовлен" : "Курс группы подготовится при открытии";

  return `
    <article class="teacher-card">
      <div class="teacher-card__header">
        <div>
          <span class="teacher-card__eyebrow">Группа ${group.group_number}</span>
          <h3 class="teacher-card__title">${templateTitle}</h3>
        </div>
        <span class="teacher-card__badge">${group.students_count} студентов</span>
      </div>
      <p class="teacher-card__text">${courseStatus}</p>
      <div class="teacher-card__actions">
        <a href="/teacher/groups/${group.id}" class="btn btn-primary" data-spa-link>Открыть группу</a>
      </div>
    </article>
  `;
}

export default class TeacherDashboard {
  constructor() {
    this.data = [];
    this.page = null;
  }

  async fetchData() {
    const response = await TeacherPortalService.getMyGroups();
    this.data = response.data;
  }

  render() {
    const user = getAuthUser();
    const groupsMarkup = this.data.length > 0
      ? this.data.map(renderGroupCard).join("")
      : `
        <div class="teacher-empty-state">
          <h3 class="teacher-empty-state__title">Группы пока не назначены</h3>
          <p class="teacher-empty-state__text">Когда администратор закрепит за вами группы, они появятся здесь.</p>
        </div>
      `;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="teacher-page">
        <div class="page-hero teacher-page__hero">
          <div class="page-hero__main">
            <span class="page-hero__eyebrow">Кабинет преподавателя</span>
            <h1 class="page-hero__title">Здравствуйте, ${user.first_name}</h1>
            <p class="page-hero__description">
              Здесь собраны ваши группы, а также вход в настройки предметов и предпочтений по расписанию.
            </p>
          </div>
          <div class="page-hero__meta">
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Закреплено групп</span>
              <strong class="page-hero__meta-value">${this.data.length}</strong>
            </div>
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Быстрый доступ</span>
              <a href="/teacher/preferences" class="btn btn-secondary" data-spa-link>Настроить предметы</a>
            </div>
          </div>
        </div>

        <section class="teacher-section">
          <div class="teacher-section__header">
            <div>
              <span class="teacher-section__eyebrow">Назначения</span>
              <h2 class="teacher-section__title">Группы</h2>
            </div>
          </div>
          <div class="teacher-card-grid">
            ${groupsMarkup}
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
