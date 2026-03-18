import FormComponent from "../../../core/FormComponent.js";
import SelectComponent from "../MultiSelect/SelectComponent.js";

export default class SelectFormComponent extends FormComponent {
  constructor({ Service, id = null, containerElement = null, selectConfigs = [] }) {
    const mode = id ? "update" : "create";
    super({Service: Service, mode, id, containerElement });
    this.selectConfigs = selectConfigs;
    this.optionsByField = {};
    this.selectComponents = [];
  }

  async fetchData() {
    try {
      if (this.id && this.mode === "update") {
        this.data = await this.Service.getById(this.id);
      }

      const entries = await Promise.all(this.selectConfigs.map(async config => {
        const options = await config.loadOptions();
        const mappedOptions = options.data.map(option => config.mapOption(option));
        return [config.field, mappedOptions];
      }));

      this.optionsByField = Object.fromEntries(entries);
    } catch (error) {
      console.error(error);
    }
    console.log(this.data);
  }

  initCustomFields() {
    this.selectConfigs.forEach(config => {
      const options = this.optionsByField[config.field] ?? [];
      const initialValue = config.getInitialValue(this.data);
      const selectContainer = this.form.querySelector(`[data-select=${config.field}]`);
      const select = new SelectComponent(
        {
          container: selectContainer,
          options: options,
          initialValue: initialValue,
          placeholder: config.placeholder,
          field: config.field,
          mode: config.mode,
          label: config.label
        }
      );
      this.selectComponents.push(select);
    });
  }

  getFormData() {
    const payload = super.getFormData();

    this.selectComponents.forEach(select => {
      payload[select.field] = select.getValue();
    });

    return payload;
  }

  _calculateDiff(original, current) {
    const diff = {};

    this.selectConfigs.forEach(config => {
      const currentValue = current?.[config.field];
      const initialValue = config.getInitialValue(original);
      console.log(initialValue, currentValue);

      if (config.mode === "single") {
        if (currentValue !== initialValue) {
          diff[config.field] = currentValue;
        }
        return;
      }

      const currentValues = Array.isArray(currentValue) ? currentValue : [];
      const initialValues = Array.isArray(initialValue) ? initialValue : [];
      const initialSet = new Set(initialValues);

      const same = currentValues.length === initialValues.length &&
        currentValues.every(id => initialSet.has(id));

      if (!same) {
        diff[config.field] = currentValues;
      }
    });

    const selectFields = new Set(this.selectConfigs.map(config => config.field));
    for (const key in current) {
      if (selectFields.has(key)) continue;
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
