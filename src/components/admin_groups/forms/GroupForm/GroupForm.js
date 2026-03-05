import template from "./GroupForm.html?raw";
import GroupService from "../../../../services/GroupService.js";
import StudentService from "../../../../services/StudentService.js";
import SelectFormComponent from "../../../common/forms/SelectFormComponent.js";
import CourseService from "../../../../services/CourseService.js";

export default class GroupForm extends SelectFormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null }) {
    const selectConfigs = [
      {
        field: "student_ids",
        mode: "multiple",
        label: "Студенты",
        placeholder: "Выберите студентов",
        loadOptions: () => StudentService.getAll(),
        mapOption: (student) => ({value: student.id, text: `${student.last_name} ${student.first_name}`}),
        getInitialValue: (group) => (group.students ?? []).map(student => student.id),
      },
      {
        field: "course_id",
        mode: "single",
        label: "Курс",
        placeholder: "Выберите курс",
        loadOptions: () => CourseService.getAll(),
        mapOption: (course) => ({value: course.id, text: course.title}),
        getInitialValue: (group) => group.course?.id ?? null,
      }
    ];

    super({ Service: GroupService, id, selectConfigs, containerElement });
    this.template = template;
    this.successUrl = "/admin/groups";
    this.cancelUrl = "/admin/groups";

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;
  }
}
