import template from "./StudentForm.html?raw";
import StudentService from "../../services/StudentService";
import GroupService from "../../services/GroupService";
import SelectFormComponent from "../../core/SelectFormComponent";

export default class StudentForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null }) {
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

    super({ Service: StudentService, id, msConfigs, containerElement });
    this.template = template;
    this.successUrl = "/admin/students";
    this.cancelUrl = "/admin/students";

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;
  }
}
