import template from "./StudentForm.html?raw";
import StudentService from "../../../../services/StudentService.js";
import GroupService from "../../../../services/GroupService.js";
import SelectFormComponent from "../../../common/forms/SelectFormComponent.js";
import { getPanelPath } from "../../../../utils/panelRoute.js";

export default class StudentForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null }) {
    const selectConfigs = [
      {
        field: "group_ids",
        mode: "multiple",
        label: "Группы",
        placeholder: "Выберите группы",
        loadOptions: () => GroupService.getAll(),
        mapOption: (group) => ({ value: group.id, text: `${group.group_number}` }),
        getInitialValue: (student) => (student.groups ?? []).map(group => group.id),
      },
    ];

    super({ Service: StudentService, id, selectConfigs, containerElement });
    this.template = template;
    this.successUrl = getPanelPath("/students");
    this.cancelUrl = getPanelPath("/students");

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;
  }

  mount() {
    super.mount();
    this.form.querySelector('[name="password"]').required = this.mode === "create";
  }

  normalizePayload(payload) {
    const normalizedPayload = {...payload};
    if (this.mode === "update" && normalizedPayload.password === "") {
      delete normalizedPayload.password;
    }
    return normalizedPayload;
  }
}
