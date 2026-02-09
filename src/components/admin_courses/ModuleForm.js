import template from './ModuleForm.html?raw';
import FormComponent from "../../core/FormComponent";
import ModuleService from "../../services/ModuleService";

export default class ModuleForm extends FormComponent {
  constructor({id = null, containerElementId = "component", successHandler = null, cancelHandler = null, courseId = null}) {
    const mode = id ? "update" : "create";
    super({Service: ModuleService, mode, id, containerElementId});
    this.template = template;

    this.successUrl = "/admin/modules";
    this.cancelUrl = "/admin/modules";

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;

    this.courseId = courseId;
  }

  getFormData() {
    const data = super.getFormData();
    if (this.courseId !== null) {
      data.course_id = this.courseId;
    }
    return data;
  }
}
