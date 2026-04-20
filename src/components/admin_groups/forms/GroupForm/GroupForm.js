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

    this.scheduleContainer.appendChild(fragment);
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

    this.form.addEventListener("click", this.boundSlotsClickHandler);
  }

  removeEventListeners() {
    super.removeEventListeners();
    this.form?.removeEventListener("click", this.boundSlotsClickHandler);
    this.boundSlotsClickHandler = null;
  }
}
