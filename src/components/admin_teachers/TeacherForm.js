import template from "./TeacherForm.html?raw";
import TeacherService from "../../services/TeacherService";
import GroupService from "../../services/GroupService";
import SelectFormComponent from "../../core/SelectFormComponent";

export default class TeacherForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null }) {
    const msConfigs = [
      {
        dataKey: "groups",
        listService: GroupService,
        dataField: "groups",
        listKey: "group_ids",
        name: "group_ids[]",
        label: group => `${group.group_number}`,
        placeholder: "Выберите группы",
      },
    ];

    super({ Service: TeacherService, id, msConfigs, containerElement });
    this.template = template;
    this.successUrl = "/admin/teachers";
    this.cancelUrl = "/admin/teachers";

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;
  }

  mount() {
    super.mount();
    this.form.querySelector('[name="password"]').required = this.mode === "create";
  }
}
