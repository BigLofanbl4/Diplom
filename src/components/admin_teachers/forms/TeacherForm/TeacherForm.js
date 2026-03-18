import template from "./TeacherForm.html?raw";
import TeacherService from "../../../../services/TeacherService.js";
import FormComponent from "../../../../core/FormComponent.js";

export default class TeacherForm extends FormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null }) {
    const mode = id ? "update" : "create";
    super({ Service: TeacherService, id, mode, containerElement });
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

  normalizePayload(payload) {
    const normalizedPayload = {...payload};
    if (this.mode === "update" && normalizedPayload.password === "") {
      delete normalizedPayload.password;
    }
    return normalizedPayload;
  }
}
