import template from "./GroupsTable.html?raw";
import GroupService from "../../../../services/GroupService.js";
import TableComponent from "../../../../core/TableComponent.js";
import { GroupRow }from "../../ui/GroupsTableRow/GroupsTableRow.template.js";


export default class GroupsTable extends TableComponent {
  constructor({ containerElement = null}) {
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
      containerElement: containerElement
    });
  }
}
