const TEACHER_ASSIGNABLE_TYPES = new Set(["check_homework", "check_tests"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSelectControl({ id, name, optionsMarkup, required = false }) {
  return `
    <label class="task-select-wrap" for="${id}">
      <select class="form-select task-select" id="${id}" name="${name}" ${required ? "required" : ""}>
        ${optionsMarkup}
      </select>
      <span class="task-select-wrap__icon" aria-hidden="true">
        <i class="fa-solid fa-chevron-down"></i>
      </span>
    </label>
  `;
}

function renderAssigneeField({ shouldShowTeacherSelect, teachers, selectedTeacherId }) {
  if (!shouldShowTeacherSelect) {
    return "";
  }

  const teacherOptions = `
    <option value="">Выберите учителя</option>
    ${teachers.map((teacher) => `
      <option value="${teacher.id}" ${String(teacher.id) === selectedTeacherId ? "selected" : ""}>
        ${escapeHtml(teacher.display_name)}
      </option>
    `).join("")}
  `;

  return `
    <div class="form-group" data-task-assignee-slot>
      <label class="form-label" for="task-assignee-teacher">Назначить учителю</label>
      ${renderSelectControl({
        id: "task-assignee-teacher",
        name: "assignee_teacher_id",
        optionsMarkup: teacherOptions,
        required: true,
      })}
    </div>
  `;
}

export default class TaskCreateForm {
  constructor({
    role = "teacher",
    options = {},
    onSubmit = null,
    onCancel = null,
    containerElement = null,
  }) {
    this.role = role;
    this.options = options;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    this.containerElement = containerElement;
    this.selectedType = this.options.task_types?.[0]?.value ?? "";
    this.selectedTeacherId = "";
    this.description = "";
    this.isSubmitting = false;
    this.root = null;
  }

  get shouldShowTeacherSelect() {
    return TEACHER_ASSIGNABLE_TYPES.has(this.selectedType) && Boolean(this.options.can_assign_teacher_tasks);
  }

  render() {
    const taskTypeOptions = (this.options.task_types ?? []).map((item) => `
      <option value="${escapeHtml(item.value)}" ${item.value === this.selectedType ? "selected" : ""}>
        ${escapeHtml(item.label)}
      </option>
    `).join("");

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <form class="form task-form task-form--modal" data-task-form>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="task-type">Тип задачи</label>
            ${renderSelectControl({
              id: "task-type",
              name: "type",
              optionsMarkup: taskTypeOptions,
              required: true,
            })}
          </div>

          ${renderAssigneeField({
            shouldShowTeacherSelect: this.shouldShowTeacherSelect,
            teachers: this.options.teachers ?? [],
            selectedTeacherId: this.selectedTeacherId,
          })}

          <div class="form-group form-group--full-width">
            <label class="form-label" for="task-description">Описание</label>
            <textarea class="form-input" id="task-description" name="description" placeholder="Опишите задачу, контекст и ожидаемый результат" required>${escapeHtml(this.description)}</textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-action="cancel">Отмена</button>
          <button type="submit" class="btn btn-primary" ${this.isSubmitting ? "disabled" : ""}>
            ${this.isSubmitting ? "Сохраняем..." : "Создать задачу"}
          </button>
        </div>
      </form>
    `;

    this.root = wrapper.firstElementChild;
  }

  mount() {
    this.containerElement?.appendChild(this.root);
  }

  refreshAssigneeField() {
    const currentSlot = this.root?.querySelector("[data-task-assignee-slot]");
    const nextMarkup = renderAssigneeField({
      shouldShowTeacherSelect: this.shouldShowTeacherSelect,
      teachers: this.options.teachers ?? [],
      selectedTeacherId: this.selectedTeacherId,
    }).trim();

    if (!nextMarkup && currentSlot) {
      currentSlot.remove();
      return;
    }

    if (!nextMarkup) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = nextMarkup;
    const nextSlot = wrapper.firstElementChild;
    if (!nextSlot) return;

    if (currentSlot) {
      currentSlot.replaceWith(nextSlot);
    } else {
      const descriptionGroup = this.root?.querySelector(".form-group--full-width");
      descriptionGroup?.insertAdjacentElement("beforebegin", nextSlot);
    }

    nextSlot.querySelector('[name="assignee_teacher_id"]')?.addEventListener("change", this.handleTeacherChange);
  }

  handleEvents() {
    this.form = this.root;
    this.handleTypeChange = (event) => {
      this.selectedType = event.target.value;
      this.refreshAssigneeField();
    };
    this.handleTeacherChange = (event) => {
      this.selectedTeacherId = event.target.value;
    };
    this.handleDescriptionInput = (event) => {
      this.description = event.target.value;
    };
    this.handleCancelClick = (event) => {
      if (event.target.closest('[data-action="cancel"]')) {
        this.onCancel?.();
      }
    };
    this.handleSubmit = async (event) => {
      event.preventDefault();
      if (this.isSubmitting) return;

      const formData = new FormData(this.form);
      const payload = {
        type: String(formData.get("type") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
      };
      const assigneeTeacherId = String(formData.get("assignee_teacher_id") ?? "").trim();
      if (assigneeTeacherId) {
        payload.assignee_teacher_id = Number(assigneeTeacherId);
      }

      this.isSubmitting = true;
      this.updateSubmitState();

      try {
        await this.onSubmit?.(payload);
      } finally {
        this.isSubmitting = false;
        this.updateSubmitState();
      }
    };

    this.form?.querySelector('[name="type"]')?.addEventListener("change", this.handleTypeChange);
    this.form?.querySelector('[name="assignee_teacher_id"]')?.addEventListener("change", this.handleTeacherChange);
    this.form?.querySelector('[name="description"]')?.addEventListener("input", this.handleDescriptionInput);
    this.form?.addEventListener("click", this.handleCancelClick);
    this.form?.addEventListener("submit", this.handleSubmit);
  }

  updateSubmitState() {
    const submitButton = this.form?.querySelector('[type="submit"]');
    if (!submitButton) return;
    submitButton.disabled = this.isSubmitting;
    submitButton.textContent = this.isSubmitting ? "Сохраняем..." : "Создать задачу";
  }

  async draw() {
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    this.form?.querySelector('[name="type"]')?.removeEventListener("change", this.handleTypeChange);
    this.form?.querySelector('[name="assignee_teacher_id"]')?.removeEventListener("change", this.handleTeacherChange);
    this.form?.querySelector('[name="description"]')?.removeEventListener("input", this.handleDescriptionInput);
    this.form?.removeEventListener("click", this.handleCancelClick);
    this.form?.removeEventListener("submit", this.handleSubmit);
    this.root?.remove();
    this.form = null;
    this.root = null;
  }
}
