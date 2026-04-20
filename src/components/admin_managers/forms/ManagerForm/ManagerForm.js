import template from "./ManagerForm.html?raw";
import FormComponent from "../../../../core/FormComponent.js";
import ManagerService from "../../../../services/ManagerService.js";

export default class ManagerForm extends FormComponent {
  constructor({ id = null, successHandler = null, cancelHandler = null, containerElement = null }) {
    const mode = id ? "update" : "create";
    super({ Service: ManagerService, id, mode, containerElement });
    this.template = template;
    this.successUrl = "/admin/managers";
    this.cancelUrl = "/admin/managers";

    this.successHandler = successHandler ?? this.successHandler;
    this.cancelHandler = cancelHandler ?? this.cancelHandler;
  }

  mount() {
    super.mount();
    this.form.querySelector('[name="password"]').required = this.mode === "create";
  }

  normalizePayload(payload) {
    const normalizedPayload = { ...payload };
    if (this.mode === "update" && normalizedPayload.password === "") {
      delete normalizedPayload.password;
    }
    return normalizedPayload;
  }
}
