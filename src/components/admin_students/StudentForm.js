import template from "./StudentForm.html?raw";
import StudentService from "../../services/StudentService";
import GroupService from "../../services/GroupService";
import SelectFormComponent from "../../core/SelectFormComponent";

export default class StudentForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null }) {
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

    super({ Service: StudentService, id, msConfigs });
    this.template = template;
    const defaultSuccessHandler = () => window.router.navigate("/admin/students");
    const defaultCancelHandler = () => window.router.navigate("/admin/students");

    this.successHandler = successHandler ? successHandler : defaultSuccessHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : defaultCancelHandler;
  }
}
