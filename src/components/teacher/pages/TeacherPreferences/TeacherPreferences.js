import ModalWithComponent from "../../../common/ModalWithComponent/ModalWithComponent.js";
import TeacherPortalService from "../../../../services/TeacherPortalService.js";

const DAY_OPTIONS = [
  { value: "monday", label: "Понедельник" },
  { value: "tuesday", label: "Вторник" },
  { value: "wednesday", label: "Среда" },
  { value: "thursday", label: "Четверг" },
  { value: "friday", label: "Пятница" },
  { value: "saturday", label: "Суббота" },
];

const CALENDAR_START_HOUR = 0;
const CALENDAR_END_HOUR = 24;
const CALENDAR_STEP_MINUTES = 30;

function padTime(value) {
  return String(value).padStart(2, "0");
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${padTime(hours)}:${padTime(minutes)}`;
}

function buildTimeSlots() {
  const slots = [];
  for (let minutes = CALENDAR_START_HOUR * 60; minutes < CALENDAR_END_HOUR * 60; minutes += CALENDAR_STEP_MINUTES) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
}

function buildSelectedCalendarCells(schedulePreferences = []) {
  const selectedCells = new Set();

  schedulePreferences.forEach((slot) => {
    const startMinutes = toMinutes(slot.start);
    const endMinutes = toMinutes(slot.end);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += CALENDAR_STEP_MINUTES) {
      selectedCells.add(`${slot.day}|${minutesToTime(minutes)}`);
    }
  });

  return selectedCells;
}

function serializeCalendarSelection(selectedCells) {
  const result = [];

  DAY_OPTIONS.forEach(({ value: day }) => {
    const dayMinutes = Array.from(selectedCells)
      .filter((cellKey) => cellKey.startsWith(`${day}|`))
      .map((cellKey) => toMinutes(cellKey.split("|")[1]))
      .sort((left, right) => left - right);

    if (dayMinutes.length === 0) return;

    let rangeStart = dayMinutes[0];
    let previous = dayMinutes[0];

    for (let index = 1; index <= dayMinutes.length; index += 1) {
      const current = dayMinutes[index];
      const isContiguous = current === previous + CALENDAR_STEP_MINUTES;

      if (isContiguous) {
        previous = current;
        continue;
      }

      result.push({
        id: crypto.randomUUID(),
        day,
        start: minutesToTime(rangeStart),
        end: minutesToTime(previous + CALENDAR_STEP_MINUTES),
      });

      rangeStart = current;
      previous = current;
    }
  });

  return result;
}

function renderCalendarGrid(timeSlots, selectedCells) {
  return `
    <div class="teacher-calendar" data-calendar>
      <div class="teacher-calendar__corner"></div>
      ${DAY_OPTIONS.map((day) => `<div class="teacher-calendar__day">${day.label}</div>`).join("")}
      ${timeSlots.map((time) => `
        <div class="teacher-calendar__time">${time}</div>
        ${DAY_OPTIONS.map((day) => {
          const cellKey = `${day.value}|${time}`;
          const isActive = selectedCells.has(cellKey);
          return `
            <button
              type="button"
              class="teacher-calendar__cell ${isActive ? "is-active" : ""}"
              data-action="toggle-calendar-cell"
              data-cell-key="${cellKey}"
              aria-pressed="${isActive ? "true" : "false"}"
              title="${day.label}, ${time}"
            ></button>
          `;
        }).join("")}
      `).join("")}
    </div>
  `;
}

function renderSelectedCourseChip(course) {
  return `<span class="table__chip">${course.title}</span>`;
}

class CoursePickerModal {
  constructor({ selectedCourseIds = [], availableCourses = [], onSave = null, onCancel = null, containerElement = null }) {
    this.selectedCourseIds = new Set(selectedCourseIds);
    this.availableCourses = availableCourses;
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.containerElement = containerElement;
    this.root = null;
    this.boundClickHandler = null;
  }

  render() {
        const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="teacher-course-picker">
        <p class="teacher-course-picker__text">
          Выберите курсы, которые преподаватель готов вести.
        </p>
        <div class="teacher-course-picker__list">
          ${this.availableCourses.map((course) => `
            <label class="teacher-course-option">
              <input
                class="teacher-course-option__input"
                type="checkbox"
                value="${course.id}"
                ${this.selectedCourseIds.has(course.id) ? "checked" : ""}
              >
              <span class="teacher-course-option__check" aria-hidden="true"></span>
              <div class="teacher-course-option__body">
                <strong class="teacher-course-option__title">${course.title}</strong>
              </div>
            </label>
          `).join("")}
        </div>
        <div class="teacher-form-actions">
          <button type="button" class="btn btn-secondary" data-action="cancel">Отмена</button>
          <button type="button" class="btn btn-primary" data-action="save">Сохранить выбор</button>
        </div>
      </div>
    `;

    this.root = wrapper.firstElementChild;
  }

  mount() {
    this.containerElement.appendChild(this.root);
  }

  handleEvents() {
    this.boundClickHandler = (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;

      if (action === "cancel") {
        this.onCancel?.();
        return;
      }

      if (action === "save") {
        const selectedCourseIds = Array.from(this.root.querySelectorAll('input[type="checkbox"]:checked'))
          .map((checkbox) => Number(checkbox.value));
        this.onSave?.(selectedCourseIds);
      }
    };

    this.root?.addEventListener("click", this.boundClickHandler);
  }

  async draw() {
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    this.root?.removeEventListener("click", this.boundClickHandler);
    this.root?.remove();
    this.root = null;
  }
}

export default class TeacherPreferences {
  constructor() {
    this.data = null;
    this.page = null;
    this.form = null;
    this.selectedCoursesElement = null;
    this.selectedCourseIds = [];
    this.selectedCalendarCells = new Set();
    this.calendarElement = null;
    this.calendarTimeSlots = buildTimeSlots();
    this.isCalendarDragging = false;
    this.calendarDragValue = false;
    this.boundClickHandler = null;
    this.boundSubmitHandler = null;
    this.boundMouseDownHandler = null;
    this.boundMouseOverHandler = null;
    this.boundMouseUpHandler = null;
  }

  async fetchData() {
    this.data = await TeacherPortalService.getMyPreferences();
    this.selectedCourseIds = [...(this.data.course_ids ?? [])];
    this.selectedCalendarCells = buildSelectedCalendarCells(this.data.schedule_preferences);
  }

  render() {
    const selectedCourses = this.getSelectedCourses();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section class="teacher-page">
        <div class="page-hero teacher-page__hero">
          <div class="page-hero__main">
            <span class="page-hero__eyebrow">Заготовка преподавателя</span>
            <h1 class="page-hero__title">Предметы и предпочтения по расписанию</h1>
            <p class="page-hero__description">
              Этот экран готовит базу под дальнейшее планирование нагрузки: выбираем шаблонные курсы и отмечаем удобные временные окна.
            </p>
          </div>
        </div>

        <form class="teacher-preferences" data-preferences-form>
          <section class="teacher-section">
            <div class="teacher-section__header teacher-section__header--between">
              <div>
                <span class="teacher-section__eyebrow">Предметы</span>
                <h2 class="teacher-section__title">Что вы готовы вести</h2>
              </div>
              <button type="button" class="btn btn-secondary" data-action="select-courses">Выбрать предметы</button>
            </div>
            <div class="teacher-chip-list" data-selected-courses>
              ${selectedCourses.length > 0
                ? selectedCourses.map(renderSelectedCourseChip).join("")
                : `<span class="teacher-muted">Предметы пока не выбраны</span>`}
            </div>
          </section>

          <section class="teacher-section">
            <div class="teacher-section__header teacher-section__header--between">
              <div>
                <span class="teacher-section__eyebrow">Календарь</span>
                <h2 class="teacher-section__title">Предпочтительное расписание</h2>
                <p class="teacher-section__description">
                  Выделите на сетке удобные рабочие интервалы. Можно тянуть мышкой по ячейкам, как в календаре.
                </p>
              </div>
              <button type="button" class="btn btn-secondary" data-action="clear-calendar">Очистить</button>
            </div>
            <div class="teacher-calendar-wrap" data-calendar-wrap>
              ${renderCalendarGrid(this.calendarTimeSlots, this.selectedCalendarCells)}
            </div>
          </section>

          <div class="teacher-form-actions">
            <button type="submit" class="btn btn-primary">Сохранить настройки</button>
          </div>
        </form>
      </section>
    `;

    this.page = wrapper.firstElementChild;
    this.form = this.page.querySelector("[data-preferences-form]");
    this.selectedCoursesElement = this.page.querySelector("[data-selected-courses]");
    this.calendarElement = this.page.querySelector("[data-calendar]");
  }

  mount() {
    document.getElementById("component").appendChild(this.page);
  }

  handleEvents() {
    this.boundClickHandler = (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;

      if (action === "select-courses") {
        this.openCoursePickerModal();
      }

      if (action === "clear-calendar") {
        this.selectedCalendarCells.clear();
        this.renderCalendar();
      }
    };

    this.boundSubmitHandler = async (event) => {
      event.preventDefault();

      await TeacherPortalService.updateMyPreferences({
        course_ids: this.selectedCourseIds,
        schedule_preferences: serializeCalendarSelection(this.selectedCalendarCells),
      });

      alert("Настройки сохранены");
      await this.reload();
    };

    this.page.addEventListener("click", this.boundClickHandler);
    this.form.addEventListener("submit", this.boundSubmitHandler);
    this.bindCalendarEvents();
  }

  getSelectedCourses() {
    const availableCourses = this.data.available_courses ?? [];
    return availableCourses.filter((course) => this.selectedCourseIds.includes(course.id));
  }

  renderSelectedCourses() {
    if (!this.selectedCoursesElement) return;
    const selectedCourses = this.getSelectedCourses();
    this.selectedCoursesElement.innerHTML = selectedCourses.length > 0
      ? selectedCourses.map(renderSelectedCourseChip).join("")
      : `<span class="teacher-muted">Предметы пока не выбраны</span>`;
  }

  openCoursePickerModal() {
    const modal = new ModalWithComponent({
      Component: CoursePickerModal,
      componentProps: {
        selectedCourseIds: this.selectedCourseIds,
        availableCourses: this.data.available_courses ?? [],
        onSave: (selectedCourseIds) => {
          this.selectedCourseIds = selectedCourseIds;
          this.renderSelectedCourses();
          modal.destroy();
        },
        onCancel: () => modal.destroy(),
      },
      title: "Выбрать предметы",
    });

    modal.draw();
  }

  bindCalendarEvents() {
    if (!this.calendarElement) return;

    this.boundMouseDownHandler = (event) => {
      const cell = event.target.closest("[data-cell-key]");
      if (!cell) return;

      event.preventDefault();
      const cellKey = cell.dataset.cellKey;
      const shouldActivate = !this.selectedCalendarCells.has(cellKey);
      this.isCalendarDragging = true;
      this.calendarDragValue = shouldActivate;
      this.setCalendarCellState(cellKey, shouldActivate);
    };

    this.boundMouseOverHandler = (event) => {
      if (!this.isCalendarDragging) return;
      const cell = event.target.closest("[data-cell-key]");
      if (!cell) return;

      this.setCalendarCellState(cell.dataset.cellKey, this.calendarDragValue);
    };

    this.boundMouseUpHandler = () => {
      this.isCalendarDragging = false;
    };

    this.calendarElement.addEventListener("mousedown", this.boundMouseDownHandler);
    this.calendarElement.addEventListener("mouseover", this.boundMouseOverHandler);
    document.addEventListener("mouseup", this.boundMouseUpHandler);
  }

  setCalendarCellState(cellKey, shouldActivate) {
    if (shouldActivate) {
      this.selectedCalendarCells.add(cellKey);
    } else {
      this.selectedCalendarCells.delete(cellKey);
    }
    this.renderCalendar();
  }

  renderCalendar() {
    if (!this.calendarElement) return;

    this.calendarElement.querySelectorAll("[data-cell-key]").forEach((cell) => {
      const cellKey = cell.dataset.cellKey;
      const isActive = this.selectedCalendarCells.has(cellKey);
      cell.classList.toggle("is-active", isActive);
      cell.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
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
    this.form?.removeEventListener("submit", this.boundSubmitHandler);
    this.calendarElement?.removeEventListener("mousedown", this.boundMouseDownHandler);
    this.calendarElement?.removeEventListener("mouseover", this.boundMouseOverHandler);
    document.removeEventListener("mouseup", this.boundMouseUpHandler);
    this.page?.remove();
    this.page = null;
    this.form = null;
    this.selectedCoursesElement = null;
    this.calendarElement = null;
  }
}
