import template from "./StudentsTable.html?raw";
import TableComponent from "../../../../core/TableComponent.js";
import StudentService from "../../../../services/StudentService.js";
import { StudentRow } from "../../ui/StudentsTableRow/StudentsTableRow.template.js";
import { getPanelPath } from "../../../../utils/panelRoute.js";

export default class StudentsTable extends TableComponent {
  constructor({ containerElement = null }) {
    super({
      Service: StudentService,
      template,
      rowRenderer: StudentRow,
      idAttr: "studentId",
      entityName: "студента",
      containerElement: containerElement
    });
  }

  render() {
    super.render();
    const createLink = this.root?.querySelector("[data-create-student-link]");
    if (createLink) {
      createLink.setAttribute("href", getPanelPath("/students/create"));
    }
  }
}
