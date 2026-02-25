import template from './ModuleForm.html?raw';
import FormComponent from "../../../../core/FormComponent.js";
import ModuleService from "../../../../services/ModuleService.js";

export default class ModuleForm extends FormComponent {
  constructor({
                id = null,
                containerElement = null,
                successHandler = null,
                cancelHandler = null,
                courseId = null
  }) {
    const mode = id ? "update" : "create";
    super({Service: ModuleService, mode, id, containerElement});
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

  async fetchData() {
    if (!this.id) return;
    if (this.courseId === null) throw new Error("ModuleForm: courseId is required for update mode");
    this.data = await this.Service.getById(this.courseId, this.id);
  }

  async submit(data) {
    if (this.courseId === null) throw new Error("ModuleForm: courseId is required");
    if (this.mode === "create") {
      return await this.Service.create(this.courseId, data);
    }
    if (this.mode === "update") {
      return await this.Service.update(this.courseId, this.id, data);
    }
  }
}
