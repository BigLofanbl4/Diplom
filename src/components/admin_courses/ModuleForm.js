import template from './ModuleForm.html?raw';
import FormComponent from "../../core/FormComponent";
import ModuleService from "../../services/ModuleService";

export default class ModuleForm extends FormComponent {
  constructor({ id = null }) {
    const mode = id ? "update" : "create";
    super(ModuleService, mode, id);
    this.template = template;
  }
}