import template from "./TeacherForm.html?raw";
import TeacherService from "../../services/TeacherService";
import GroupService from "../../services/GroupService";
import SelectFormComponent from "../../core/SelectFormComponent";

export default class TeacherForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null}) {
    const msConfigs = [
      {
        elementId: "ms",
        listService: GroupService,
        dataField: "groups",
        listKey: "group_ids",
        name: "group_ids[]",
        label: group => `${group.group_number}`,
        placeholder: "Выберите группы",
      },
    ];

    super({ Service: TeacherService, id, msConfigs });
    this.template = template;

    const defaultSuccessHandler = () => window.router.navigate("/admin/teachers");
    const defaultCancelHandler = () => window.router.navigate("/admin/teachers");

    this.successHandler = successHandler ? successHandler : defaultSuccessHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : defaultCancelHandler;
  }

  mount() {
    super.mount();
    this.form.querySelector('[name="password"]').required = this.mode === "create";
  }
}
