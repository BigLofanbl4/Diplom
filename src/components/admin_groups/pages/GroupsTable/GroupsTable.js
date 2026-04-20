import template from "./GroupsTable.html?raw";
import GroupService from "../../../../services/GroupService.js";
import TableComponent from "../../../../core/TableComponent.js";
import { GroupRow }from "../../ui/GroupsTableRow/GroupsTableRow.template.js";
import { getPanelPath } from "../../../../utils/panelRoute.js";


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
          <td class="table__col table__large-col" colspan="7">Групп нет!</td>
        </tr>
      `,
      containerElement: containerElement
    });
  }

  render() {
    super.render();
    const createLink = this.root?.querySelector("[data-create-group-link]");
    if (createLink) {
      createLink.setAttribute("href", getPanelPath("/groups/create"));
    }
  }
}
