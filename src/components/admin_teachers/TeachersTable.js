import template from './TeachersTable.html?raw';
import { TeacherRow } from './TeachersTableRow.template';
import TableComponent from '../../core/TableComponent';
import TeacherService from '../../services/TeacherService';

export default class TeachersList extends TableComponent {
  constructor() {
    super(TeacherService);
  }

  async fetchData() {
    this.data = await this.Service.getAll();
  }

  render() {
    this.template = template;
    this.rowsHTML = this.data.map(teacher => TeacherRow(teacher)).join("");
  }

  mount() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = this.template;
    this.tbody = componentContainer.querySelector(".table__body");
    if (this.tbody) {
      this.tbody.innerHTML = this.rowsHTML;
    }
  }

  handleEvents() {

    this.boundClickHandler = (event) => {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;

      if (btn.dataset.action === "delete") {
        alert(`Delete ${btn.closest("tr").dataset.teacherId}`);
      }
    };

    this.tbody.addEventListener("click", this.boundClickHandler);
  }

  removeEventListeners() {
    if (this.boundClickHandler) {
      this.tbody.removeEventListener("click", this.boundClickHandler);
    }
  }
}