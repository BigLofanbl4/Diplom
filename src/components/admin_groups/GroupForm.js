import template from "./GroupForm.html?raw";
import FormComponent from "../../core/FormComponent";
import GroupService from "../../services/GroupService";
import StudentService from "../../services/StudentService";
import MultiSelect from "../common/MultiSelect/MultiSelect";

export default class GroupForm extends FormComponent {
  constructor({ id = null }) {
    const mode = id ? "update" : "create";
    super(GroupService, mode, id);
    this.allStudents = null;
    this.successUrl = "/admin/groups"
  }

  async fetchData() {
    try {
      if (this.id && this.mode === "update") {
        this.data = await this.Service.getById(this.id);
      }
      this.allStudents = await StudentService.getAll();
    } catch (error) {
      console.error("Возникла ошибка", error);
    }
  }

  render() {
      this.template = template;
  }

  mount() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = this.template;
    this.form = componentContainer.querySelector("form");
    this.multiSelectElem = document.getElementById("ms");
  }

  async submit(data) {
    try {
      if (this.mode === "create") {
        await this.Service.create(data);
      } else if (this.mode === "update") {
        const payload = this._calculateDiff(this.data, data);
        console.log(payload);
        await this.Service.update(this.id, payload);
      }
    } catch (error) {
      // Уведомление об ошибке
      console.error("Ошибка отправки данных:", error);
    }
  }

  getFormData() {
    const data = super.getFormData();
    data.student_ids = data.student_ids.map(id => Number(id));
    return data;
  }

  _calculateDiff(original, current) {
    const diff = {};

    const currentStudentIds = current.student_ids;
    const initialStudentIds = original.students.map(s => s.id);

    const isStudentsChanged = currentStudentIds.length !== initialStudentIds.length ||
                            !currentStudentIds.every(id => initialStudentIds.includes(id));

    if (isStudentsChanged) {
      diff.student_ids = currentStudentIds;
    }

    for (const key in current) {
      if (key === "student_ids") continue;
      if (current[key] !== original[key]) {
        diff[key] = current[key];
      }
    }
    return diff;
  }

  initCustomFields() {
    const options = this.allStudents.map(student => ({
      value: student.id,
      text: `${student.last_name} ${student.first_name}`
    }));

    const defaultOptions = (this.data?.students ?? []).map(student => ({
      value: student.id,
      text: `${student.last_name} ${student.first_name}`
    }));

    new MultiSelect(
      this.multiSelectElem,
      options,
      defaultOptions,
      "Выберите студентов",
      "student_ids[]"
    )
  }

};