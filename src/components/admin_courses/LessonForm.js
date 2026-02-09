import template from "./LessonForm.html?raw";
import FormComponent from "../../core/FormComponent";
import LessonService from "../../services/LessonService";

export default class LessonForm extends FormComponent {
  constructor({
                id = null,
                containerElement = null,
                successHandler = null,
                cancelHandler = null,
                moduleId = null,
                courseId = null
              }) {
    const mode = id ? "update" : "create";
    super({Service: LessonService, id, mode, containerElement});
    this.template = template;

    this.successUrl = "/admin/lessons";
    this.cancelUrl = "/admin/lessons";

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;

    this.moduleId = moduleId;
    this.courseId = courseId;
  }

  getFormData() {
    const data = super.getFormData();
    if (this.moduleId !== null) {
      data.module_id = this.moduleId;
    }

    if (this.courseId !== null) {
      data.course_id = this.courseId;
    }
    return data;
  }
}
