import template from './AssignTeacher.html?raw';
import { debounce } from "../../../../utils/debounce.js";

export default class AssignTeacherView {
  constructor({ containerElement }) {
    this.template = template;
    this.containerElement = containerElement;

    this.rootElement = null;
    this.currentTeacherElem = null;
    this.removeTeacherBtn = null;
    this.filterElement = null;
    this.teachersTable = null;

    this.handleRemove = null;
    this.handleAssign = null;
    this.debounceHandleFilter = null;

    this.boundHandleRemove = null;
    this.boundHandleAssign = null;
    this.boundHandleFilter = null;
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

    this.currentTeacherElem = wrapper.querySelector("[data-current-teacher]");
    this.removeTeacherBtn = wrapper.querySelector("[data-action='removeTeacher']");

    this.rootElement = wrapper.querySelector("[data-component-root]");
    this.filterElement = wrapper.querySelector("[data-teacher-filter]");
    this.teachersTable = wrapper.querySelector("[data-teachers-table]");

    this.containerElement.appendChild(this.rootElement);
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

  bindHandlers({ handleRemove, handleAssign, handleFilter }) {
    this.handleRemove = handleRemove;
    this.handleAssign = handleAssign;
    this.debounceHandleFilter = debounce(handleFilter, 400);
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
  }

  cleanHandlers() {
    this.teachersTable?.removeEventListener("click", this.boundHandleAssign);
    this.removeTeacherBtn?.removeEventListener("click", this.boundHandleRemove);
    this.filterElement?.removeEventListener("input", this.boundHandleFilter);

    this.handleRemove = null;
    this.handleAssign = null;
    this.debounceHandleFilter = null;

    this.boundHandleRemove = null;
    this.boundHandleAssign = null;
    this.boundHandleFilter = null;
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
    tableCol.colSpan = 3;

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

    const actionCol = document.createElement("td");
    actionCol.classList.add("table__col", "table__small-col");
    actionCol.dataset.label = "Действия";
    const actionButton = document.createElement("button");
    actionButton.classList.add("btn", "btn-primary");
    actionButton.dataset.action = "assignTeacher";
    actionButton.textContent = "Назначить";

    actionCol.appendChild(actionButton);

    tableRow.append(idCol, nameCol, actionCol);

    return tableRow;
  }
}
