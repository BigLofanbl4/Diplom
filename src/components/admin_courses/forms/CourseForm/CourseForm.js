import template from "./CourseForm.html?raw";
import FormComponent from "../../../../core/FormComponent.js";
import CourseService from "../../../../services/CourseService.js";

export default class CourseForm extends FormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null  }) {
    const mode = id ? "update" : "create";
    super({Service: CourseService, mode, id, containerElement});
    this.template = template;
    this.successUrl = "/admin/courses";
    this.cancelUrl = "/admin/courses";

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;
  }
}
