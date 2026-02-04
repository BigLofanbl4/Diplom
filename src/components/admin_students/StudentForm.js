import template from "./StudentForm.html?raw";
import StudentService from "../../services/StudentService";
import GroupService from "../../services/GroupService";
import SelectFormComponent from "../../core/SelectFormComponent";

export default class StudentForm extends SelectFormComponent {
  constructor({ id = null }) {
    const msConfigs = [
      {
        elementId: "ms",
        listService: GroupService,
        dataField: "groups",
        listKey: "group_ids",
        name: "group_ids[]",
        label: g => `${g.group_number}`,
        placeholder: "Выберите группы",
      },
    ];

    super(StudentService, id, msConfigs);
    this.template = template;
    this.successUrl = "/admin/students";
  }
}
