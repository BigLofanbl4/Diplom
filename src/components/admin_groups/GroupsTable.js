import template from "./GroupsTable.html?raw";
import GroupService from "../../services/GroupService";
import TableComponent from "../../core/TableComponent";
import { GroupRow }from "./GroupsTableRow.template";


export default class GroupsTable extends TableComponent {
  constructor() {
    super(GroupService);
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
    this.rowsHTML = this.data.map(group => GroupRow(group)).join("");
    if (!this.rowsHTML) this.rowsHTML = `
      <tr class="table__row">
        <td class="table__col table__large-col">Групп нет!</td>
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
    this.boundClickHandler = async (event) => {
          const btn = event.target.closest("[data-action]");
          const tr = event.target.closest("tr");
    
          if (!btn) return;
    
          if (btn.dataset.action === "delete") {
            const accept = confirm(`Удалить группу ID: ${tr.dataset.groupId}`);
            if (!accept) return;
            
            try {
              const success = await this.Service.delete(tr.dataset.groupId);
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
