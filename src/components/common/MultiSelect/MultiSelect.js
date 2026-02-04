export default class MultiSelect {
  constructor(element, options = [], defaultOptions = [], placeholder = "Поиск", name = "", required = false) {
    this.container = typeof(element) === "string" ? document.getElementById(element) : element;
    this.options = options;
    this.defaultOptions = defaultOptions;
    this.selected = new Set(defaultOptions.map(v => v.value));
    this.placeholder = placeholder;
    this.name = name;
    this.required = required;

    this.init();
  }

  init() {
    this._renderLayout();
    this._cacheElements();
    this._renderSelected();
    this._bindEvents();
  }

  _renderLayout() {
    this.container.innerHTML = `
      <div class="ms">
        <select name="${this.name}" multiple style="display: none;" ${this.required ? "required" : ""}></select>
        <div class="ms__values">
          <input class="ms__input" id="ms_input" type="text" placeholder="${this.placeholder}">
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

  _renderSelected() {
    this.valuesContainer.querySelectorAll(".ms__value").forEach(el => el.remove());
    this.hiddenSelect.innerHTML = "";

    this.options.forEach(opt => {
      if (this.selected.has(opt.value)) {
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
      return !this.selected.has(opt.value) && 
      opt.text.toLowerCase().includes(filter.toLowerCase());
    });

    if (filtered.length === 0) {
      this.optionsContainer.style.display = "none";
      this.activeIndex = -1;
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
    this.input.addEventListener("input", (e) => this._renderDropdown(e.target.value.trim()));
    this.input.addEventListener("focus", () => this._renderDropdown());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && this.input.value === "" && this.selected.size > 0) {
        const lastValue = Array.from(this.selected).pop();
        this.selected.delete(lastValue);
        this._renderSelected();
        this._renderDropdown();
      }
    });

    this._onOutsideClick = (e) => {
      if (!this.container.contains(e.target)) {
        this.optionsContainer.style.display = "none";
      }
    }
    document.addEventListener("click", this._onOutsideClick);

    this.container.addEventListener("mousedown", (e) => {
      const optionEl = e.target.closest(".ms__option");
      const chipEl = e.target.closest(".ms__value");

      if (optionEl) {
        e.preventDefault();
        const val = optionEl.dataset.value;
        this.selected.add(Number(val) || val);
        this.input.value = "";
        this._renderSelected();
        this._renderDropdown();
      }

      if (chipEl) {
        const val = chipEl.dataset.value;
        this.selected.delete(Number(val) || val);
        this._renderSelected();
      }
    });
  }

  getSelectedValues() {
      return Array.from(this.selected);
  }

  destroy() {
      document.removeEventListener("click", this._onOutsideClick);
  }
}