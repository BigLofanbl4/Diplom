import template from "./GroupForm.html?raw";
import GroupService from "../../../../services/GroupService.js";
import StudentService from "../../../../services/StudentService.js";
import SelectFormComponent from "../../../common/forms/SelectFormComponent.js";
import CourseService from "../../../../services/CourseService.js";
import { getPanelPath } from "../../../../utils/panelRoute.js";

const DAY_OPTIONS = [
  { value: "monday", label: "Понедельник" },
  { value: "tuesday", label: "Вторник" },
  { value: "wednesday", label: "Среда" },
  { value: "thursday", label: "Четверг" },
  { value: "friday", label: "Пятница" },
  { value: "saturday", label: "Суббота" },
];

const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((option) => [option.value, option.label]));

function buildDefaultSlot() {
  return {
    id: crypto.randomUUID(),
    day: "monday",
    start: "12:00",
    end: "13:30",
  };
}

export default class GroupForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null }) {
    const selectConfigs = [
      {
        field: "student_ids",
        mode: "multiple",
        label: "Студенты",
        placeholder: "Выберите студентов",
        loadOptions: () => StudentService.getAll(),
        mapOption: (student) => ({value: student.id, text: `${student.last_name} ${student.first_name}`}),
        getInitialValue: (group) => (group.students ?? []).map(student => student.id),
      },
      {
        field: "course_id",
        mode: "single",
        label: "Курс",
        placeholder: "Выберите курс",
        loadOptions: () => CourseService.getAll(),
        mapOption: (course) => ({value: course.id, text: course.title}),
        getInitialValue: (group) => group.course?.id ?? null,
      }
    ];

    super({ Service: GroupService, id, selectConfigs, containerElement });
    this.template = template;
    this.successUrl = getPanelPath("/groups");
    this.cancelUrl = getPanelPath("/groups");
    this.scheduleRows = [];
    this.scheduleContainer = null;
    this.boundSlotsClickHandler = null;
    this.boundSlotsInputHandler = null;

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;
  }

  initCustomFields() {
    super.initCustomFields();
    this.scheduleContainer = this.form.querySelector("[data-schedule-slots]");
    this.scheduleRows = Array.isArray(this.data.planned_schedule_slots) && this.data.planned_schedule_slots.length > 0
      ? this.data.planned_schedule_slots.map((slot) => ({ ...slot }))
      : [buildDefaultSlot()];
    this.renderScheduleRows();
  }

  renderScheduleRows() {
    if (!this.scheduleContainer) return;

    this.scheduleContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();

    this.scheduleRows.forEach((slot, index) => {
      const row = document.createElement("article");
      row.classList.add("group-slot-card");
      row.dataset.slotIndex = String(index);
      row.innerHTML = `
        <div class="group-slot-card__top">
          <div class="group-slot-card__meta">
            <span class="group-slot-card__index">Слот ${index + 1}</span>
            <strong class="group-slot-card__summary" data-slot-summary>${this.getSlotSummary(slot)}</strong>
          </div>
          <button class="group-slot-card__remove" type="button" data-action="removeSlot" aria-label="Удалить слот">
            Удалить
          </button>
        </div>

        <div class="group-slot-card__fields">
          <label class="group-slot-field group-slot-field--day">
            <span class="group-slot-field__label">День</span>
            <select class="form-input" data-slot-field="day">
              ${DAY_OPTIONS.map((option) => `
                <option value="${option.value}" ${option.value === slot.day ? "selected" : ""}>${option.label}</option>
              `).join("")}
            </select>
          </label>

          <label class="group-slot-field">
            <span class="group-slot-field__label">С</span>
            <input class="form-input" type="time" value="${slot.start ?? ""}" data-slot-field="start">
          </label>

          <label class="group-slot-field">
            <span class="group-slot-field__label">До</span>
            <input class="form-input" type="time" value="${slot.end ?? ""}" data-slot-field="end">
          </label>
        </div>
      `;
      fragment.appendChild(row);
    });

    this.scheduleContainer.appendChild(fragment);
  }

  getSlotSummary(slot = {}) {
    const dayLabel = DAY_LABELS[slot.day] ?? "День не выбран";
    const start = slot.start || "--:--";
    const end = slot.end || "--:--";
    return `${dayLabel} • ${start}–${end}`;
  }

  refreshSlotSummary(row) {
    if (!row) return;

    const slot = {
      day: row.querySelector("[data-slot-field='day']")?.value ?? "",
      start: row.querySelector("[data-slot-field='start']")?.value ?? "",
      end: row.querySelector("[data-slot-field='end']")?.value ?? "",
    };

    const summary = row.querySelector("[data-slot-summary]");
    if (summary) {
      summary.textContent = this.getSlotSummary(slot);
    }
  }

  getSchedulePayload() {
    return Array.from(this.scheduleContainer?.querySelectorAll("[data-slot-index]") ?? [])
      .map((row) => ({
        id: this.scheduleRows[Number(row.dataset.slotIndex)]?.id ?? crypto.randomUUID(),
        day: row.querySelector("[data-slot-field='day']")?.value ?? "",
        start: row.querySelector("[data-slot-field='start']")?.value ?? "",
        end: row.querySelector("[data-slot-field='end']")?.value ?? "",
      }))
      .filter((slot) => slot.day && slot.start && slot.end);
  }

  getFormData() {
    const payload = super.getFormData();
    payload.planned_schedule_slots = this.getSchedulePayload();
    return payload;
  }

  handleEvents() {
    super.handleEvents();

    this.boundSlotsClickHandler = (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;

      if (action === "addSlot") {
        this.scheduleRows.push(buildDefaultSlot());
        this.renderScheduleRows();
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
          this.renderScheduleRows();
        }
      }
    };

    this.boundSlotsInputHandler = (event) => {
      const row = event.target.closest("[data-slot-index]");
      if (!row) return;
      this.refreshSlotSummary(row);
    };

    this.form.addEventListener("click", this.boundSlotsClickHandler);
    this.form.addEventListener("input", this.boundSlotsInputHandler);
    this.form.addEventListener("change", this.boundSlotsInputHandler);
  }

  removeEventListeners() {
    super.removeEventListeners();
    this.form?.removeEventListener("click", this.boundSlotsClickHandler);
    this.form?.removeEventListener("input", this.boundSlotsInputHandler);
    this.form?.removeEventListener("change", this.boundSlotsInputHandler);
    this.boundSlotsClickHandler = null;
    this.boundSlotsInputHandler = null;
  }
}
