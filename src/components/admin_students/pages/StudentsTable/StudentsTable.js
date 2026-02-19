import template from "./StudentsTable.html?raw";
import TableComponent from "../../../../core/TableComponent.js";
import StudentService from "../../../../services/StudentService.js";
import { StudentRow } from "../../ui/StudentsTableRow/StudentsTableRow.template.js";

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
}
