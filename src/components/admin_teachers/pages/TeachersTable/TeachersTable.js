import template from './TeachersTable.html?raw';
import { TeacherRow } from '../../ui/TeachersTableRow/TeachersTableRow.template.js';
import TableComponent from '../../../../core/TableComponent.js';
import TeacherService from '../../../../services/TeacherService.js';
import { getPanelPath, isAdminRole } from "../../../../utils/panelRoute.js";

export default class TeachersTable extends TableComponent {
  constructor({ containerElement = null }) {
    super({
      Service: TeacherService,
      template,
      rowRenderer: TeacherRow,
      idAttr: "teacherId",
      entityName: "преподавателя",
      containerElement: containerElement
    });
  }

  render() {
    super.render();
    const createLink = this.root?.querySelector("[data-create-teacher-link]");
    if (!createLink) return;

    if (!isAdminRole()) {
      createLink.remove();
      return;
    }

    createLink.setAttribute("href", getPanelPath("/teachers/create"));
  }
}
