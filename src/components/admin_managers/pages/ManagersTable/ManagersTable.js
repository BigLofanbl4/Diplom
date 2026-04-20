import template from "./ManagersTable.html?raw";
import TableComponent from "../../../../core/TableComponent.js";
import ManagerService from "../../../../services/ManagerService.js";
import { ManagerRow } from "../../ui/ManagersTableRow/ManagersTableRow.template.js";

export default class ManagersTable extends TableComponent {
  constructor({ containerElement = null }) {
    super({
      Service: ManagerService,
      template,
      rowRenderer: ManagerRow,
      idAttr: "managerId",
      entityName: "менеджера",
      containerElement,
    });
  }
}
