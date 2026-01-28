import template from './TeacherForm.html?raw';
import TeacherService from '../../services/TeacherService';
import FormComponent from '../../core/FormComponent';

export default class TeacherForm extends FormComponent {
  constructor({ id = null }) {
    const mode = id ? "update" : "create";
    super(TeacherService, mode, id);
    this.successUrl = "/admin/teachers";
  }

  render() {
    this.template = template;
  }
}