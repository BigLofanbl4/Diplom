import template from './ModuleForm.html?raw';
import FormComponent from "../../core/FormComponent";
import ModuleService from "../../services/ModuleService";

export default class ModuleForm extends FormComponent {
  constructor({id = null, containerElementId = "component", successHandler = null, cancelHandler = null, courseId = null}) {
    const mode = id ? "update" : "create";
    super({Service: ModuleService, mode, id, containerElementId});
    this.template = template;

    const defaultSuccessHandler = () => window.router.navigate("/admin/modules");
    const defaultCancelHandler = () => window.router.navigate("/admin/modules");

    this.successHandler = successHandler ? successHandler : defaultSuccessHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : defaultCancelHandler;

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