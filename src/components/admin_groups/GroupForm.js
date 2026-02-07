import template from "./GroupForm.html?raw";
import GroupService from "../../services/GroupService";
import StudentService from "../../services/StudentService";
import SelectFormComponent from "../../core/SelectFormComponent";

export default class GroupForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null }) {
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

    super({ Service: GroupService, id, msConfigs });
    this.template = template;
    const defaultSuccessHandler = () => window.router.navigate("/admin/groups");
    const defaultCancelHandler = () => window.router.navigate("/admin/groups");

    this.successHandler = successHandler ? successHandler : defaultSuccessHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : defaultCancelHandler;
  }
}
