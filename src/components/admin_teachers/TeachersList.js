import template from './TeachersList.html?raw'
import TableComponent from '../../core/TableComponent';


export default class TeachersList extends TableComponent {
  async fetchData() {
    const response = await fetch("/api/teachers");
    this.data = await response.json();
  }

  render() {
    this.template = template;
    this.rowsHTML = this.data.map(teacher => this.generateTeacherRow(teacher)).join("");
  }

  generateTeacherRow(teacher) {
    const ovz = teacher.is_ovz ? `<span class="table__badge table__badge--success">Да</span>` :
                                  `<span class="table__badge table__badge--warning">Нет</span>`
    const fullName = `${teacher.first_name} ${teacher.last_name}`;
    return `
      <tr class="table__row" data-teacher-id="${teacher.id}">
      <td class="table__col table__id-col" data-label="ID">${teacher.id}</td>
      <td class="table__col table__small-col" data-label="Логин">${teacher.login}</td>
      <td class="table__col table__medium-col" data-label="Организация">Заглушка</td>
      <td class="table__col table__medium-col" data-label="Телефон">${teacher.phone}</td>
      <td class="table__col table__large-col" data-label="ФИО">${fullName}</td>
      <td class="table__col table__small-col" data-label="Возраст">${teacher.age}</td>
      <td class="table__col table__small-col" data-label="ОВЗ">${ovz}</td>
      <td class="table__col table__small-col" data-label="Действия">
        <div class="table__actions">
          <button class="table__action-btn" data-action="update" title="Редактировать">
            ✏️
          </button>
          <button class="table__action-btn table__action-btn--danger" data-action="delete" title="Удалить">
            🗑️
          </button>
        </div>
      </td>
    </tr>
    `;
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

      if (btn.dataset.action === "update") {
        alert(`Edit ${btn.closest("tr").dataset.teacherId}`);
      }

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