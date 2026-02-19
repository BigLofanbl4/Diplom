import template from './TeachersTable.html?raw';
import { TeacherRow } from '../../ui/TeachersTableRow/TeachersTableRow.template.js';
import TableComponent from '../../../../core/TableComponent.js';
import TeacherService from '../../../../services/TeacherService.js';

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
}
