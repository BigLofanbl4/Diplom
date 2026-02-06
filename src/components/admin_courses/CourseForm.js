import template from "./CourseForm.html?raw";
import FormComponent from "../../core/FormComponent";
import CourseService from "../../services/CourseService";

export default class CourseForm extends FormComponent {
  constructor({ id = null }) {
    const mode = id ? "update" : "create";
    super(CourseService, mode, id);
    this.template = template;
    this.successUrl = "/admin/courses";
  }
}