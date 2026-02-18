import FormComponent from "../../../core/FormComponent.js";
import MultiSelect from "../MultiSelect/MultiSelect.js";

export default class SelectFormComponent extends FormComponent {
  constructor({ Service, id = null, containerElement = null, msConfigs = [] }) {
    const mode = id ? "update" : "create";
    super({Service: Service, mode, id, containerElement });
    this.msLists = {};
    this.msConfigs = msConfigs;
  }

  async fetchData() {
    try {
      if (this.id && this.mode === "update") {
        this.data = await this.Service.getById(this.id);
      }
      const entries = await Promise.all(this.msConfigs.map(async config => {
        const items = await config.listService.getAll();
        const key = config.elementId;
        return [key, items];
      }));
      this.msLists = Object.fromEntries(entries);
    } catch (error) {
      console.error(error);
    }
  }

  initCustomFields() {
    this.msConfigs.forEach(config => {
      const options = (this.msLists?.[config.elementId] ?? []).map(entity => ({
        value: entity.id,
        text: config.label(entity)
      }));

      const defaultOptions = (this.data?.[config.dataField] ?? []).map(entity => ({
        value: entity.id,
        text: config.label(entity)
      }));

      const msContainer = this.form.querySelector(`[data-ms=${config.dataKey}]`);
      new MultiSelect(
        msContainer,
        options,
        defaultOptions,
        config.placeholder,
        config.name
      );
    });
  }

  getFormData() {
    const formData = super.getFormData();
    this.msConfigs.forEach(config => {
      const key = config.listKey;
      formData[key] = (formData[key] ?? []).map((id) => Number(id));
    });
    return formData;
  }

  _calculateDiff(original, current) {
    const diff = {};

    this.msConfigs.forEach(config => {
      const currentEntityIds = (current?.[config.listKey] ?? []);
      const initialEntityIds = (original?.[config.dataField] ?? []).map(e => e.id);
      const initialSet = new Set(initialEntityIds);

      const same = currentEntityIds.length === initialEntityIds.length &&
        currentEntityIds.every(id => initialSet.has(id));

      if (!same) {
        diff[config.listKey] = currentEntityIds;
      }
    });

    const listKeysSet = new Set(this.msConfigs.map(config => config.listKey));
    for (const key in current) {
      if (listKeysSet.has(key)) continue;
      if (current[key] !== original[key]) {
        diff[key] = current[key];
      }
    }

    return diff;
  }

  async submit(formData) {
    if (this.mode === "create") {
      await this.Service.create(formData);
    } else if (this.mode === "update") {
      const payload = this._calculateDiff(this.data, formData);
      await this.Service.update(this.id, payload);
    }
  }
}
