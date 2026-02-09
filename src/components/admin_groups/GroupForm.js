import template from "./GroupForm.html?raw";
import GroupService from "../../services/GroupService";
import StudentService from "../../services/StudentService";
import SelectFormComponent from "../../core/SelectFormComponent";

export default class GroupForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null }) {
    const msConfigs = [
      {
        dataKey: "students",
        listService: StudentService,
        dataField: "students",
        listKey: "student_ids",
        name: "student_ids[]",
        label: s => `${s.last_name} ${s.first_name}`,
        placeholder: "Выберите студентов",
      },
    ];

    super({ Service: GroupService, id, msConfigs, containerElement });
    this.template = template;
    this.successUrl = "/admin/groups";
    this.cancelUrl = "/admin/groups";

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;
  }
}
