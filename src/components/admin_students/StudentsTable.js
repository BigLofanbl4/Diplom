import template from "./StudentsTable.html?raw";
import TableComponent from "../../core/TableComponent";
import StudentService from "../../services/StudentService";
import { StudentRow } from "./StudentsTableRow.template";

export default class StudentsTable extends TableComponent {
  constructor() {
    super({
      Service: StudentService,
      template,
      rowRenderer: StudentRow,
      idAttr: "studentId",
      entityName: "студента",
    });
  }
}
