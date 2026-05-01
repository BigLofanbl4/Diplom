import TaskService from "../../../../services/TaskService.js";
import { getPanelPath } from "../../../../utils/panelRoute.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMonitoringRow(item) {
  const statusLabel = item.has_active_auto_task
    ? "Автозадача назначена"
    : item.auto_task_reasons?.length
      ? "Порог достигнут"
      : "В норме";
  const statusClass = item.has_active_auto_task
    ? "task-monitor-card__status--alert"
    : item.auto_task_reasons?.length
      ? "task-monitor-card__status--warn"
      : "task-monitor-card__status--ok";
  const issueLabel = item.has_active_auto_task
    ? "Требует внимания"
    : item.auto_task_reasons?.length
      ? "На пороге"
      : "Стабильно";

  return `
    <tr class="task-monitor-table__row">
      <td class="task-monitor-table__cell task-monitor-table__cell--teacher">
        <div class="task-monitor-table__teacher">
          <strong class="task-monitor-table__teacher-name">${escapeHtml(item.teacher_name)}</strong>
          <span class="task-monitor-table__teacher-meta">${escapeHtml(issueLabel)}</span>
        </div>
      </td>
      <td class="task-monitor-table__cell">${item.groups_count ?? 0}</td>
      <td class="task-monitor-table__cell">${item.lessons_count ?? 0}</td>
      <td class="task-monitor-table__cell">${item.missing_homework_lessons_count ?? 0}</td>
      <td class="task-monitor-table__cell">${item.pending_review_submissions_count ?? 0}</td>
      <td class="task-monitor-table__cell task-monitor-table__cell--status">
        <span class="task-monitor-card__status ${statusClass}">${escapeHtml(statusLabel)}</span>
      </td>
    </tr>
  `;
}

function getMonitoringStats(items) {
  return items.reduce((acc, item) => {
    acc.total += 1;
    if (item.has_active_auto_task) acc.withAutoTask += 1;
    if ((item.auto_task_reasons?.length ?? 0) > 0) acc.atRisk += 1;
    if ((item.missing_homework_lessons_count ?? 0) > 0) acc.withMissingHomework += 1;
    if ((item.pending_review_submissions_count ?? 0) > 0) acc.withPendingReview += 1;
    return acc;
  }, {
    total: 0,
    withAutoTask: 0,
    atRisk: 0,
    withMissingHomework: 0,
    withPendingReview: 0,
  });
}

function sortMonitoringItems(items) {
  return [...items].sort((left, right) => {
    const leftPriority = (left.has_active_auto_task ? 1 : 0) - (right.has_active_auto_task ? 1 : 0);
    if (leftPriority !== 0) return -leftPriority;

    const leftReasons = (left.auto_task_reasons?.length ?? 0) - (right.auto_task_reasons?.length ?? 0);
    if (leftReasons !== 0) return -leftReasons;

    const leftPending = (left.pending_review_submissions_count ?? 0) - (right.pending_review_submissions_count ?? 0);
    if (leftPending !== 0) return -leftPending;

    const leftMissing = (left.missing_homework_lessons_count ?? 0) - (right.missing_homework_lessons_count ?? 0);
    if (leftMissing !== 0) return -leftMissing;

    return String(left.teacher_name ?? "").localeCompare(String(right.teacher_name ?? ""), "ru");
  });
}

function filterProblemMonitoringItems(items) {
  return items.filter((item) =>
    item.has_active_auto_task
    || (item.auto_task_reasons?.length ?? 0) > 0
    || (item.missing_homework_lessons_count ?? 0) > 0
    || (item.pending_review_submissions_count ?? 0) > 0
  );
}

export default class HomeworkMonitoringDashboard {
  constructor() {
    this.monitoring = [];
    this.page = null;
  }

  async fetchData() {
    const response = await TaskService.getAll();
    this.monitoring = Array.isArray(response.monitoring) ? response.monitoring : [];
  }

  render() {
    const monitoringStats = getMonitoringStats(this.monitoring);
    const monitoringItems = sortMonitoringItems(filterProblemMonitoringItems(this.monitoring));

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="teacher-page task-page">
        <div class="page-hero teacher-page__hero">
          <div class="page-hero__main">
            <span class="page-hero__eyebrow">Контроль ДЗ</span>
            <h1 class="page-hero__title">Заполнение и проверка домашних заданий</h1>
            <p class="page-hero__description">
              Следите за дисциплиной по домашним заданиям по всем преподавателям. Список автоматически поднимает наверх тех, кому уже назначена задача или кто подошёл к порогу.
            </p>
          </div>
          <div class="page-hero__meta">
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Преподавателей</span>
              <strong class="page-hero__meta-value">${monitoringStats.total}</strong>
            </div>
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Быстрый доступ</span>
              <a href="${getPanelPath("/tasks")}" class="btn btn-secondary" data-spa-link>
                Вернуться к задачам
              </a>
            </div>
          </div>
        </div>

        <section class="teacher-section">
          <div class="teacher-section__header">
            <div>
              <span class="teacher-section__eyebrow">Порог эскалации</span>
              <h2 class="teacher-section__title">Операционный мониторинг</h2>
              <p class="teacher-section__description">
                Автозадача назначается, если у преподавателя нет ДЗ на 5 уроках или накопилось 20 непроверенных работ по разным ученикам и группам.
              </p>
            </div>
          </div>

          <div class="task-monitor-overview">
            <div class="task-monitor-overview__item">
              <span class="task-card__meta-label">Всего преподавателей</span>
              <strong class="task-monitor-overview__value">${monitoringStats.total}</strong>
            </div>
            <div class="task-monitor-overview__item">
              <span class="task-card__meta-label">С автозадачей</span>
              <strong class="task-monitor-overview__value">${monitoringStats.withAutoTask}</strong>
            </div>
            <div class="task-monitor-overview__item">
              <span class="task-card__meta-label">В зоне риска</span>
              <strong class="task-monitor-overview__value">${monitoringStats.atRisk}</strong>
            </div>
            <div class="task-monitor-overview__item">
              <span class="task-card__meta-label">С пробелами по ДЗ</span>
              <strong class="task-monitor-overview__value">${monitoringStats.withMissingHomework}</strong>
            </div>
            <div class="task-monitor-overview__item">
              <span class="task-card__meta-label">С долгом по проверке</span>
              <strong class="task-monitor-overview__value">${monitoringStats.withPendingReview}</strong>
            </div>
          </div>

          <div class="task-monitor-table-wrap">
            ${monitoringItems.length
              ? `
                <table class="task-monitor-table">
                  <thead>
                    <tr>
                      <th>Преподаватель</th>
                      <th>Групп</th>
                      <th>Уроков</th>
                      <th>Без ДЗ</th>
                      <th>Непроверено</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${monitoringItems.map((item) => renderMonitoringRow(item)).join("")}
                  </tbody>
                </table>
              `
              : `
                <div class="teacher-empty-state">
                  <h3 class="teacher-empty-state__title">Проблемных преподавателей сейчас нет</h3>
                  <p class="teacher-empty-state__text">Все текущие преподаватели либо в норме, либо еще не подошли к порогу эскалации.</p>
                </div>
              `}
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
    this.page = null;
  }
}
