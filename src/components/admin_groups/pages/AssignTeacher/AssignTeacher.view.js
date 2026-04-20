import template from './AssignTeacher.html?raw';
import { debounce } from "../../../../utils/debounce.js";
import { getPanelPath } from "../../../../utils/panelRoute.js";

const DAY_OPTIONS = [
  { value: "monday", label: "Понедельник" },
  { value: "tuesday", label: "Вторник" },
  { value: "wednesday", label: "Среда" },
  { value: "thursday", label: "Четверг" },
  { value: "friday", label: "Пятница" },
  { value: "saturday", label: "Суббота" },
];

function buildDefaultSlot() {
  return {
    id: crypto.randomUUID(),
    day: "monday",
    start: "12:00",
    end: "13:30",
  };
}

export default class AssignTeacherView {
  constructor({ containerElement }) {
    this.template = template;
    this.containerElement = containerElement;

    this.rootElement = null;
    this.currentTeacherElem = null;
    this.removeTeacherBtn = null;
    this.filterElement = null;
    this.teachersTable = null;
    this.loadMoreBtn = null;
    this.startDateInput = null;
    this.endDateInput = null;
    this.scheduleSlotsContainer = null;
    this.scheduleRows = [];

    this.handleRemove = null;
    this.handleAssign = null;
    this.handleApplySchedule = null;
    this.debounceHandleFilter = null;
    this.handleLoadMore = null;

    this.boundHandleRemove = null;
    this.boundHandleAssign = null;
    this.boundHandleFilter = null;
    this.boundHandleLoadMore = null;
    this.boundHandlePlannerClick = null;
  }

  render(group) {
    if (!this.containerElement) {
      this.containerElement = document.getElementById("component");
    }
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.template;

    const studentsCount = Array.isArray(group.students) ? group.students.length : 0;
    const studentsPreview = studentsCount
      ? group.students
          .map((student) => `${student.first_name} ${student.last_name}`)
          .join(", ")
      : "Студенты пока не добавлены";
    const currentTeacherName = group.teacher
      ? `${group.teacher.last_name} ${group.teacher.first_name}`
      : "Преподаватель не назначен";
    wrapper.querySelector("[data-group-number-label]").textContent = `Группа ${group.group_number}`;
    wrapper.querySelector("[data-group-title]").textContent = `Подберите преподавателя для группы №${group.group_number}`;
    wrapper.querySelector("[data-course-title]").textContent = group.course?.title ?? "Не указан";
    wrapper.querySelector("[data-students-count]").textContent = String(studentsCount);
    wrapper.querySelector("[data-hero-teacher]").textContent = currentTeacherName;
    wrapper.querySelector("[data-students-preview]").textContent = studentsPreview;
    const backLink = wrapper.querySelector("[data-back-link]");
    if (backLink) {
      backLink.setAttribute("href", getPanelPath("/groups"));
    }

    this.currentTeacherElem = wrapper.querySelector("[data-current-teacher]");
    this.removeTeacherBtn = wrapper.querySelector("[data-action='removeTeacher']");
    this.loadMoreBtn = wrapper.querySelector("[data-action='loadMore']");

    this.rootElement = wrapper.querySelector("[data-component-root]");
    this.filterElement = wrapper.querySelector("[data-teacher-filter]");
    this.teachersTable = wrapper.querySelector("[data-teachers-table]");
    this.startDateInput = wrapper.querySelector("[data-group-start-date]");
    this.endDateInput = wrapper.querySelector("[data-group-end-date]");
    this.scheduleSlotsContainer = wrapper.querySelector("[data-schedule-slots]");

    this.containerElement.appendChild(this.rootElement);
  }

  toggleRemoveTeacherBtn(groupTeacher) {
    this.removeTeacherBtn.disabled = !groupTeacher;
  }

  renderTeachersTable(teachersList) {
    this.teachersTable.innerHTML = "";
    if (teachersList.length === 0) {
      this._renderEmptyTable();
      return;
    }

    const fragment = document.createDocumentFragment();
    teachersList.forEach((teacher) => {
      const teacherRow = this._renderTeacherRow(teacher);
      fragment.appendChild(teacherRow);
    });
    this.teachersTable.appendChild(fragment);
  }

  renderGroupTeacher(teacher) {
    this.currentTeacherElem.textContent = teacher
      ? `${teacher.last_name} ${teacher.first_name}`
      : "Преподаватель не назначен";
  }

  renderGroupSchedule(group) {
    if (this.startDateInput) {
      this.startDateInput.value = group.planned_start_date ?? "";
    }
    if (this.endDateInput) {
      this.endDateInput.value = group.planned_end_date ?? "";
    }

    const slots = Array.isArray(group.planned_schedule_slots) && group.planned_schedule_slots.length > 0
      ? group.planned_schedule_slots
      : [buildDefaultSlot()];

    this.scheduleRows = slots.map((slot) => ({ ...slot }));
    this.renderScheduleSlots();
  }

  renderScheduleSlots() {
    if (!this.scheduleSlotsContainer) return;

    this.scheduleSlotsContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();

    this.scheduleRows.forEach((slot, index) => {
      const row = document.createElement("div");
      row.classList.add("form-grid");
      row.dataset.slotIndex = String(index);
      row.innerHTML = `
        <div class="form-group">
          <label class="form-label">День недели</label>
          <select class="form-input" data-slot-field="day">
            ${DAY_OPTIONS.map((option) => `
              <option value="${option.value}" ${option.value === slot.day ? "selected" : ""}>${option.label}</option>
            `).join("")}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Начало</label>
          <input class="form-input" type="time" value="${slot.start ?? ""}" data-slot-field="start">
        </div>

        <div class="form-group">
          <label class="form-label">Окончание</label>
          <input class="form-input" type="time" value="${slot.end ?? ""}" data-slot-field="end">
        </div>

        <div class="form-group">
          <label class="form-label">Действие</label>
          <button class="btn btn-danger" type="button" data-action="removeSlot">Удалить слот</button>
        </div>
      `;

      fragment.appendChild(row);
    });

    this.scheduleSlotsContainer.appendChild(fragment);
  }

  getSchedulingPayload() {
    const slots = Array.from(this.scheduleSlotsContainer?.querySelectorAll("[data-slot-index]") ?? [])
      .map((row) => ({
        id: this.scheduleRows[Number(row.dataset.slotIndex)]?.id ?? crypto.randomUUID(),
        day: row.querySelector("[data-slot-field='day']")?.value ?? "",
        start: row.querySelector("[data-slot-field='start']")?.value ?? "",
        end: row.querySelector("[data-slot-field='end']")?.value ?? "",
      }))
      .filter((slot) => slot.day && slot.start && slot.end);

    return {
      planned_start_date: this.startDateInput?.value || null,
      planned_end_date: this.endDateInput?.value || null,
      planned_schedule_slots: slots,
    };
  }

  bindHandlers({ handleRemove, handleAssign, handleApplySchedule, handleFilter, handleLoadMore }) {
    this.handleRemove = handleRemove;
    this.handleAssign = handleAssign;
    this.handleApplySchedule = handleApplySchedule;
    this.debounceHandleFilter = debounce(handleFilter, 400);
    this.handleLoadMore = handleLoadMore;
  }

  assignHandlers() {
    this.boundHandleAssign = async (event) => {
      const assignBtn = event.target.closest("[data-action='assignTeacher']");
      if (!assignBtn) return;
      const teacherId = Number(event.target.closest("[data-teacher-id]").dataset.teacherId);
      await this.handleAssign(teacherId);
    };
    this.teachersTable.addEventListener("click", this.boundHandleAssign);

    this.boundHandleRemove = async (event) => {
      await this.handleRemove();
    };
    this.removeTeacherBtn.addEventListener("click", this.boundHandleRemove);

    this.boundHandleFilter = async (event) => {
      const searchInput = event.target.value;
      await this.debounceHandleFilter(searchInput);
    };
    this.filterElement.addEventListener("input", this.boundHandleFilter);

    this.boundHandleLoadMore = async (event) => {
      await this.handleLoadMore();
    };
    this.loadMoreBtn.addEventListener("click", this.boundHandleLoadMore);

    this.boundHandlePlannerClick = async (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;

      if (action === "addSlot") {
        this.scheduleRows.push(buildDefaultSlot());
        this.renderScheduleSlots();
        return;
      }

      if (action === "removeSlot") {
        const row = event.target.closest("[data-slot-index]");
        const index = Number(row?.dataset.slotIndex);
        if (!Number.isNaN(index)) {
          this.scheduleRows.splice(index, 1);
          if (this.scheduleRows.length === 0) {
            this.scheduleRows.push(buildDefaultSlot());
          }
          this.renderScheduleSlots();
        }
        return;
      }

      if (action === "applySchedule") {
        await this.handleApplySchedule();
      }
    };
    this.rootElement.addEventListener("click", this.boundHandlePlannerClick);
  }

  cleanHandlers() {
    this.teachersTable?.removeEventListener("click", this.boundHandleAssign);
    this.removeTeacherBtn?.removeEventListener("click", this.boundHandleRemove);
    this.filterElement?.removeEventListener("input", this.boundHandleFilter);
    this.loadMoreBtn?.removeEventListener("click", this.boundHandleLoadMore);
    this.rootElement?.removeEventListener("click", this.boundHandlePlannerClick);

    this.handleRemove = null;
    this.handleAssign = null;
    this.handleApplySchedule = null;
    this.debounceHandleFilter = null;

    this.boundHandleRemove = null;
    this.boundHandleAssign = null;
    this.boundHandleFilter = null;
    this.boundHandlePlannerClick = null;
  }

  destroy() {
    this.cleanHandlers();
    this.rootElement?.remove();
  }

  _renderEmptyTable() {
    const tableRow = document.createElement("tr");
    tableRow.classList.add("table__row", "assign-teacher-table__empty-row");

    const tableCol = document.createElement("td");
    tableCol.classList.add("table__col", "assign-teacher-table__empty-col");
    tableCol.colSpan = 5;

    const emptyState = document.createElement("div");
    emptyState.classList.add("assign-teacher-empty");

    const emptyTitle = document.createElement("p");
    emptyTitle.classList.add("assign-teacher-empty__title");
    emptyTitle.textContent = "Преподаватели не найдены";

    const emptyText = document.createElement("p");
    emptyText.classList.add("assign-teacher-empty__text");
    emptyText.textContent = "Попробуйте изменить запрос или очистить поиск, чтобы увидеть весь список.";

    emptyState.append(emptyTitle, emptyText);
    tableCol.appendChild(emptyState);
    tableRow.appendChild(tableCol);
    this.teachersTable.appendChild(tableRow);
  }

  _renderTeacherRow(teacher) {
    const availability = teacher.availability_for_group;
    const isAvailable = availability?.is_available ?? true;
    const reasonText = availability?.reasons?.length
      ? availability.reasons.join(" ")
      : "Слот покрывается weekly-доступностью, конфликтов не найдено.";

    const tableRow = document.createElement("tr");
    tableRow.classList.add("table__row");
    tableRow.dataset.teacherId = teacher.id;

    const idCol = document.createElement("td");
    idCol.classList.add("table__col", "table__id-col");
    idCol.dataset.label = "ID";
    idCol.textContent = teacher.id;

    const nameCol = document.createElement("td");
    nameCol.classList.add("table__col", "table__medium-col");
    nameCol.dataset.label = "ФИО";
    nameCol.textContent = `${teacher.last_name} ${teacher.first_name}`;

    const statusCol = document.createElement("td");
    statusCol.classList.add("table__col", "table__medium-col");
    statusCol.dataset.label = "Статус";
    statusCol.textContent = isAvailable ? "Доступен" : "Недоступен";

    const reasonCol = document.createElement("td");
    reasonCol.classList.add("table__col", "table__medium-col");
    reasonCol.dataset.label = "Комментарий";
    reasonCol.textContent = reasonText;

    const actionCol = document.createElement("td");
    actionCol.classList.add("table__col", "table__small-col");
    actionCol.dataset.label = "Действия";
    const actionButton = document.createElement("button");
    actionButton.classList.add("btn", "btn-primary");
    actionButton.dataset.action = "assignTeacher";
    actionButton.textContent = "Назначить";
    actionButton.disabled = !isAvailable;

    actionCol.appendChild(actionButton);

    tableRow.append(idCol, nameCol, statusCol, reasonCol, actionCol);

    return tableRow;
  }
}
