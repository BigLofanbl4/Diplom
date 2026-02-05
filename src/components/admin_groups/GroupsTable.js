import template from "./GroupsTable.html?raw";
import GroupService from "../../services/GroupService";
import TableComponent from "../../core/TableComponent";
import { GroupRow }from "./GroupsTableRow.template";


export default class GroupsTable extends TableComponent {
  constructor() {
    super({
      Service: GroupService,
      template,
      rowRenderer: GroupRow,
      idAttr: "groupId",
      entityName: "группу",
      emptyRow: `
        <tr class="table__row">
          <td class="table__col table__large-col">Групп нет!</td>
        </tr>
      `,
    });
  }
}
