export default class SelectComponent {
  constructor(
    {
      container = null,
      options = [],
      initialValue = [],
      placeholder = "Поиск",
      field = "",
      required = false,
      mode = "multiple",
      label = null
    }
  ) {
    this.container = container;
    this.options = options;
    const normalizedInitialValue = Array.isArray(initialValue)
      ? initialValue
      : (initialValue === null || initialValue === undefined ? [] : [initialValue]);
    this.selectedValues = new Set(normalizedInitialValue);
    this.placeholder = placeholder;
    this.label = label ?? this.placeholder;
    this.field = field;
    this.required = required;
    this.mode = mode;
    this._onOutsideClick = null;
    this._onMouseDown = null;

    this.init();
  }

  init() {
    this._renderLayout();
    this._cacheElements();
    this._renderSelected();
    this._bindEvents();
  }

  getValue() {
    const selectedValues = Array.from(this.selectedValues);
    return this.mode === "single" ? selectedValues[0] : selectedValues;
  }

  destroy() {
    if (this._onOutsideClick) {
      document.removeEventListener("click", this._onOutsideClick);
      this._onOutsideClick = null;
    }

    if (!this.container) return;
    this.container.removeEventListener("mousedown", this._onMouseDown);
    this.container.remove();
    this.container = null;
    this._onMouseDown = null;
  }

  _renderLayout() {
    if (!this.container) throw new Error("Отсутствует контейнер для селекта");
    const inputId = `select-${this.field}`;
    this.container.innerHTML = `
      <div class="ms">
        <select name="${this.field}" ${this.mode === "multiple" ? "multiple" : ""} style="display: none;" ${this.required ? "required" : ""}></select>
        <label for="${inputId}">${this.label}</label>
        <div class="ms__values">
          <input class="ms__input" id="${inputId}" type="text" placeholder="${this.placeholder}">
        </div>
        <div class="ms__options">
        </div>
      </div>
    `;
  }

  _cacheElements() {
    this.optionsContainer = this.container.querySelector(".ms__options");
    this.valuesContainer = this.container.querySelector(".ms__values");
    this.hiddenSelect = this.container.querySelector("select");
    this.input = this.container.querySelector(".ms__input");
  }


  _clearSelected() {
    this.valuesContainer.querySelectorAll(".ms__value").forEach(el => el.remove());
    this.hiddenSelect.innerHTML = "";
  }

  _renderSelected() {
    this._clearSelected();
    this.options.forEach(opt => {
      if (this.selectedValues.has(opt.value)) {
        const chip = document.createElement("span");
        chip.classList.add("ms__value");
        chip.dataset.value = opt.value;
        chip.textContent = opt.text;
        this.input.before(chip);

        const option = document.createElement("option");
        option.value = opt.value;
        option.selected = true;
        this.hiddenSelect.appendChild(option);
      }
    });
  }

  _renderDropdown(filter = "") {
    const filtered = this.options.filter(opt => {
      return !this.selectedValues.has(opt.value) &&
        opt.text.toLowerCase().includes(filter.toLowerCase());
    });

    if (filtered.length === 0) {
      this.optionsContainer.style.display = "none";
      return;
    }

    this.optionsContainer.innerHTML = filtered.map(opt => `
        <div class="ms__option" data-value="${opt.value}">
          ${opt.text}
        </div>
    `).join("");
    this.optionsContainer.style.display = "block";
  }

  _bindEvents() {
    this._handleInput();
    this._handleSelect();
    this._handleClose();
  }

  _handleInput() {
    this.input.addEventListener("input", (e) => this._renderDropdown(e.target.value.trim()));
    this.input.addEventListener("focus", () => this._renderDropdown());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && this.input.value === "" && this.selectedValues.size > 0) {
        const lastValue = Array.from(this.selectedValues).pop();
        this.selectedValues.delete(lastValue);
        this._renderSelected();
        this._renderDropdown();
      }
    });
  }

  _handleClose() {
    this._onOutsideClick = (e) => {
      if (!this.container.contains(e.target)) {
        this.optionsContainer.style.display = "none";
      }
    }
    document.addEventListener("click", this._onOutsideClick);
  }

  _handleSelect() {
    this._onMouseDown = (e) => {
      const optionEl = e.target.closest(".ms__option");
      const chipEl = e.target.closest(".ms__value");

      if (optionEl) {
        e.preventDefault();
        const val = optionEl.dataset.value;
        if (this.mode === "single") {
          this.selectedValues.clear();
        }
        const parsed = Number(val);
        const normalized = isNaN(parsed) ? val : parsed;
        this.selectedValues.add(normalized);
        this.input.value = "";
        this._renderSelected();
        this._renderDropdown();
      }

      if (chipEl) {
        const val = chipEl.dataset.value;
        const parsed = Number(val);
        const normalized = isNaN(parsed) ? val : parsed;
        this.selectedValues.delete(normalized);
        this._renderSelected();
      }
    }

    this.container.addEventListener("mousedown", this._onMouseDown);
  }
}
