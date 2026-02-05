import template from './TeachersTable.html?raw';
import { TeacherRow } from './TeachersTableRow.template';
import TableComponent from '../../core/TableComponent';
import TeacherService from '../../services/TeacherService';

export default class TeachersTable extends TableComponent {
  constructor() {
    super({
      Service: TeacherService,
      template,
      rowRenderer: TeacherRow,
      idAttr: "teacherId",
      entityName: "преподавателя",
    });
  }
}