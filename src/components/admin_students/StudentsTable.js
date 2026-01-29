import template from "./StudentsTable.html?raw";
import TableComponent from "../../core/TableComponent";
import StudentService from "../../services/StudentService";
import { StudentRow } from "./StudentsTableRow.template";

export default class StudentsTable extends TableComponent {
  constructor() {
    super(StudentService);
  }

  async fetchData() {
    this.data = await this.Service.getAll();
  }

  render() {
    this.template = template;
    this.rowsHTML = this.data.map(student => StudentRow(student)).join("");
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
      console.log(btn);
      const tr = event.target.closest("tr");

      if (!btn) return;

      if (btn.dataset.action === "delete") {
        const accept = confirm(`Удалить студента ID: ${tr.dataset.studentId}`);
        if (!accept) return;
        
        try {
          const success = await StudentService.delete(tr.dataset.studentId);
          if (success) tr.remove();
        } catch (error) {
          console.error("Возникла ошибка при удалении: ", error);
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