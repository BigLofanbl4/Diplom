import template from "./GroupForm.html?raw";
import GroupService from "../../services/GroupService";
import StudentService from "../../services/StudentService";
import SelectFormComponent from "../../core/SelectFormComponent";

export default class GroupForm extends SelectFormComponent {
  constructor({ id = null }) {
    const msConfigs = [
      {
        elementId: "ms",
        listService: StudentService,
        dataField: "students",
        listKey: "student_ids",
        name: "student_ids[]",
        label: s => `${s.last_name} ${s.first_name}`,
        placeholder: "Выберите студентов",
      },
    ];

    super(GroupService, id, msConfigs);
    this.template = template;
    this.successUrl = "/admin/groups";
  }
}
