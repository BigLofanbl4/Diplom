import template from "./StudentForm.html?raw";
import FormComponent from "../../core/FormComponent";
import StudentService from "../../services/StudentService";
import GroupService from "../../services/GroupService";
import MultiSelect from "../common/MultiSelect/MultiSelect";

export default class StudentForm extends FormComponent {
  constructor({ id = null }) {
    const mode = id ? "update" : "create";
    super(StudentService, mode, id);
    this.allGroups = null;
    this.successUrl = "/admin/students";
  }

  async fetchData() {
    try {
      if (this.id && this.mode === "update") {
        this.data = await this.Service.getById(this.id);
      }
      this.allGroups = await GroupService.getAll();
    } catch (error) {
      console.error("Произошла ошибка", error);
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

  getFormData() {
    const data = super.getFormData();

    data.group_ids = data.group_ids.map(id => Number(id));
    
    return data;
  }

  async submit(data) {
    try {
      if (this.mode === "create") {
        await this.Service.create(data);
      } else if (this.mode === "update") {
        const payload = this._calculateDiff(this.data, data);
        await this.Service.update(this.id, payload);
      }
    } catch (error) {
      // Уведомление об ошибке
      console.error("Ошибка отправки данных:", error);
    }
  }

  _calculateDiff(original, current) {
    const diff = {};

    const currentGroupIds = current.group_ids;
    const inititalGroupIds = original.groups.map(g => g.id);

    const isGroupsChanged = currentGroupIds.length !== inititalGroupIds.length ||
                            !currentGroupIds.every(id => inititalGroupIds.includes(id));

    if (isGroupsChanged) {
      diff.group_ids = currentGroupIds;
    }

    for (const key in current) {
      if (key === "group_ids") continue;
      if (current[key] !== original[key]) {
        diff[key] = current[key];
      }
    }
    return diff;
  }

  initCustomFields() {
    const options = this.allGroups.map(group => ({
      value: group.id,
      text: `${group.group_number}`
    }));

    const defaultOptions = (this.data?.groups ?? []).map(group => ({
      value: group.id,
      text: `${group.group_number}`
    }));
    
    new MultiSelect(
      this.multiSelectElem,
      options,
      defaultOptions,
      "Выберите группы",
      "group_ids[]"    
    );
  }
}