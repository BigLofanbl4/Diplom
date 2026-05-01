import ModalWithComponent from "../../../common/ModalWithComponent/ModalWithComponent.js";
import TaskService from "../../../../services/TaskService.js";
import { getAuthUser } from "../../../../core/auth/state.js";
import { getPanelPath } from "../../../../utils/panelRoute.js";
import { showAlert, showConfirm } from "../../../../utils/dialogs.js";
import TaskCreateForm from "../../forms/TaskCreateForm.js";

function formatDateTime(value) {
  if (!value) return "Не указано";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderStatusAction(task, status, label) {
  const isCurrent = task.status === status;
  return `
    <button
      type="button"
      class="btn ${isCurrent ? "btn-primary" : "btn-secondary"}"
      data-action="set-status"
      data-task-id="${task.id}"
      data-status="${status}"
      ${isCurrent ? "disabled" : ""}
    >
      ${label}
    </button>
  `;
}

function renderTaskCard(task, role, canManageStatuses) {
  const assigneeMarkup = task.assignee
    ? `
      <div class="task-card__meta-item">
        <span class="task-card__meta-label">Исполнитель</span>
        <strong class="task-card__meta-value">${escapeHtml(task.assignee.display_name)}</strong>
      </div>
    `
    : "";

  const deleteActionMarkup = role !== "teacher"
    ? `<button type="button" class="btn btn-danger" data-action="delete-task" data-task-id="${task.id}">Удалить</button>`
    : "";

  const actionsMarkup = canManageStatuses && task.can_update_status
    ? `
      <div class="task-card__actions">
        ${renderStatusAction(task, "new", "Новая")}
        ${renderStatusAction(task, "in_progress", "Принято в работу")}
        ${renderStatusAction(task, "done", "Выполнено")}
        ${deleteActionMarkup}
      </div>
    `
    : "";

  return `
    <article class="task-card">
      <div class="task-card__top">
        <div>
          <span class="teacher-section__eyebrow">${escapeHtml(task.type_label)}</span>
          <h3 class="task-card__title">${escapeHtml(task.status_label)}</h3>
        </div>
        <span class="task-card__status task-card__status--${escapeHtml(task.status)}">${escapeHtml(task.status_label)}</span>
      </div>

      <p class="task-card__description">${escapeHtml(task.description)}</p>

      <div class="task-card__meta">
        <div class="task-card__meta-item">
          <span class="task-card__meta-label">Создал</span>
          <strong class="task-card__meta-value">${escapeHtml(task.creator.display_name)}</strong>
        </div>
        ${assigneeMarkup}
        <div class="task-card__meta-item">
          <span class="task-card__meta-label">Создано</span>
          <strong class="task-card__meta-value">${escapeHtml(formatDateTime(task.created_at))}</strong>
        </div>
      </div>

      ${actionsMarkup}
    </article>
  `;
}

export default class TasksDashboard {
  constructor() {
    this.user = getAuthUser();
    this.role = this.user?.role ?? "teacher";
    this.tasks = [];
    this.options = {
      task_types: [],
      statuses: [],
      teachers: [],
      can_assign_teacher_tasks: false,
    };
    this.isUpdating = false;
    this.page = null;
    this.createTaskModal = null;
  }

  async fetchData() {
    const [tasksResponse, optionsResponse] = await Promise.all([
      TaskService.getAll(),
      TaskService.getOptions(),
    ]);
    this.tasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
    this.options = optionsResponse;
  }

  render() {
    const taskCards = this.tasks.length > 0
      ? this.tasks.map((task) => renderTaskCard(task, this.role, true)).join("")
      : `
        <div class="teacher-empty-state">
          <h3 class="teacher-empty-state__title">Задач пока нет</h3>
          <p class="teacher-empty-state__text">
            ${this.role === "teacher"
              ? "Когда вам назначат задачу или вы создадите свою, она появится здесь."
              : "Создайте первую задачу для команды или назначьте проверку учителю."}
          </p>
        </div>
      `;

    const pageTitle = this.role === "teacher" ? "Мои задачи" : "Дашборд задач";
    const pageDescription = this.role === "teacher"
      ? "Здесь видны только ваши задачи и их текущий статус."
      : "Создавайте внутренние задачи, назначайте учителям проверки и отслеживайте исполнение в одном месте.";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="teacher-page task-page">
        <div class="page-hero teacher-page__hero">
          <div class="page-hero__main">
            <span class="page-hero__eyebrow">Task Board</span>
            <h1 class="page-hero__title">${pageTitle}</h1>
            <p class="page-hero__description">${pageDescription}</p>
          </div>
          <div class="page-hero__meta">
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Всего задач</span>
              <strong class="page-hero__meta-value">${this.tasks.length}</strong>
            </div>
            <div class="page-hero__meta-card">
              <span class="page-hero__meta-label">Быстрый доступ</span>
              <a href="${this.role === "teacher" ? "/teacher/groups" : getPanelPath("/groups", this.role)}" class="btn btn-secondary" data-spa-link>
                ${this.role === "teacher" ? "К группам" : "Открыть группы"}
              </a>
            </div>
          </div>
        </div>

        <section class="teacher-section">
          <div class="teacher-section__header teacher-section__header--between">
            <div>
              <span class="teacher-section__eyebrow">Список</span>
              <h2 class="teacher-section__title">${this.role === "teacher" ? "Назначенные мне задачи" : "Все задачи организации"}</h2>
            </div>
            <button type="button" class="btn btn-primary" data-action="open-create-modal">
              Создать задачу
            </button>
          </div>
          <div class="task-card-grid">
            ${taskCards}
          </div>
        </section>
      </section>
    `;

    this.page = wrapper.firstElementChild;
  }

  mount() {
    document.getElementById("component").appendChild(this.page);
  }

  async redraw() {
    this.destroy();
    this.render();
    this.mount();
    this.handleEvents();
  }

  async createTask(payload) {
    await TaskService.create(payload);
    await this.fetchTasksOnly();
    this.closeCreateModal();
    await this.redraw();
  }

  openCreateModal() {
    if (this.createTaskModal) return;

    const modal = new ModalWithComponent({
      Component: TaskCreateForm,
      componentProps: {
        role: this.role,
        options: this.options,
        onSubmit: async (payload) => {
          try {
            await this.createTask(payload);
          } catch (error) {
            await showAlert({
              title: "Не удалось создать задачу",
              message: error?.message || "Попробуйте еще раз.",
              variant: "danger",
            });
            throw error;
          }
        },
        onCancel: () => this.closeCreateModal(),
      },
      title: "Новая задача",
    });

    const originalDestroy = modal.destroy.bind(modal);
    modal.destroy = () => {
      originalDestroy();
      if (this.createTaskModal === modal) {
        this.createTaskModal = null;
      }
    };

    this.createTaskModal = modal;
    modal.draw();
  }

  closeCreateModal() {
    this.createTaskModal?.destroy();
    this.createTaskModal = null;
  }

  async deleteTask(taskId) {
    const confirmed = await showConfirm({
      title: "Удалить задачу",
      message: "Задача будет удалена без возможности восстановления.",
      confirmText: "Удалить",
      cancelText: "Отмена",
      variant: "danger",
    });
    if (!confirmed) return;

    await TaskService.delete(taskId);
    await this.fetchTasksOnly();
    await this.redraw();
  }

  handleEvents() {
    this.handlePageClick = async (event) => {
      const openModalButton = event.target.closest('[data-action="open-create-modal"]');
      if (openModalButton) {
        this.openCreateModal();
        return;
      }

      const deleteButton = event.target.closest('[data-action="delete-task"]');
      if (deleteButton && !this.isUpdating) {
        const taskId = Number(deleteButton.dataset.taskId);
        if (!taskId) return;

        this.isUpdating = true;
        try {
          await this.deleteTask(taskId);
        } catch (error) {
          await showAlert({
            title: "Не удалось удалить задачу",
            message: error?.message || "Попробуйте еще раз.",
            variant: "danger",
          });
        } finally {
          this.isUpdating = false;
        }
        return;
      }

      const statusButton = event.target.closest('[data-action="set-status"]');
      if (!statusButton || this.isUpdating) return;

      const taskId = Number(statusButton.dataset.taskId);
      const status = statusButton.dataset.status;
      if (!taskId || !status) return;

      this.isUpdating = true;
      try {
        await TaskService.updateStatus(taskId, status);
        await this.fetchTasksOnly();
        await this.redraw();
      } catch (error) {
        await showAlert({
          title: "Не удалось обновить статус",
          message: error?.message || "Попробуйте еще раз.",
          variant: "danger",
        });
      } finally {
        this.isUpdating = false;
      }
    };

    this.page.addEventListener("click", this.handlePageClick);
  }

  async fetchTasksOnly() {
    const tasksResponse = await TaskService.getAll();
    this.tasks = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    this.closeCreateModal();
    this.page?.removeEventListener("click", this.handlePageClick);
    this.page?.remove();
    this.page = null;
  }
}
