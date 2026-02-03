import template from './TeachersTable.html?raw';
import { TeacherRow } from './TeachersTableRow.template';
import TableComponent from '../../core/TableComponent';
import TeacherService from '../../services/TeacherService';

export default class TeachersList extends TableComponent {
  constructor() {
    super(TeacherService);
  }

  async fetchData() {
    try {
      this.data = await this.Service.getAll();
    } catch (error) {
      console.error("Возникла ошибка:", error);
    }
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
    this.boundClickHandler = async (event) => {
      const btn = event.target.closest("[data-action]");
      const tr = event.target.closest("tr");
      if (!btn) return;

      if (btn.dataset.action === "delete") {
        const accept = confirm(`Удалить преподавателя ID: ${tr.dataset.teacherId}?`);
        if (!accept) return;

        try {
          const success = await this.Service.delete(tr.dataset.teacherId)
          if (success) tr.remove();
        } catch (error) {
          // Уведомление об ошибке
          console.error("Возникла ошибка при удалении:", error);
        }
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