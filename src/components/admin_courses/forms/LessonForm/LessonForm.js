import template from "./LessonForm.html?raw";
import FormComponent from "../../../../core/FormComponent.js";
import LessonService from "../../../../services/LessonService.js";
import CourseService from "../../../../services/CourseService.js";


class FileDropzoneController {
  constructor({inputEl, dropzoneEl, listEl, hintEl = null, serverFiles = []}) {
    if (!inputEl || !dropzoneEl || !listEl) {
      throw new Error("FileDropzoneController: InputEl & DropzoneEl & listEl must be provided");
    }

    this.inputEl = inputEl;
    this.dropzoneEl = dropzoneEl;
    this.listEl = listEl;
    this.hintEl = hintEl;

    this.files = serverFiles.map(fileData => this._normalizeServerFile(fileData));
    this.removedServerFileIds = new Set();
    this.fileKeys = new Set(this.files.map(f => `${f.name}::${f.size}::${f.lastModified}`));

    this.dragDepth = 0;

    this.boundDragEnterHandler = null;
    this.boundDragLeaveHandler = null;
    this.boundDragOverHandler = null;
    this.boundDragDropHandler = null;
    this.boundInputChangeHandler = null;
    this.boundFileRemoveHandler = null;

    this._init();
  }

  handleEvents() {
    this.boundDragEnterHandler = () => this._handleDragEnter();
    this.boundDragLeaveHandler = () => this._handleDragLeave();
    this.boundDragOverHandler = (e) => this._handleDragOver(e);
    this.boundDragDropHandler = (e) => this._handleDrop(e);
    this.boundInputChangeHandler = (e) => this._handleInputChange(e);
    this.boundFileRemoveHandler = (e) => this._handleFileRemove(e);

    this.dropzoneEl.addEventListener("dragenter", this.boundDragEnterHandler);
    this.dropzoneEl.addEventListener("dragleave", this.boundDragLeaveHandler);
    this.dropzoneEl.addEventListener("dragover", this.boundDragOverHandler);
    this.dropzoneEl.addEventListener("drop", this.boundDragDropHandler);

    this.inputEl.addEventListener("change", this.boundInputChangeHandler);
    this.listEl.addEventListener("click", this.boundFileRemoveHandler);
  }

  getRemovedServerFiles() {
    return Array.from(this.removedServerFileIds);
  }

  destroy() {
    this._removeEventListeners();
    this.files.forEach(file => {
      if (file.source === "local") {
        URL.revokeObjectURL(file.url);
      }
    });
  }

  _init() {
    this._showFiles();
    this._updateInputFiles();
    this._toggleHint();
  }

  _handleDragEnter() {
    this.dragDepth += 1;
    this.dropzoneEl.classList.add("is-dragover");
  }

  _handleDragLeave() {
    this.dragDepth -= 1;
    if (this.dragDepth <= 0) {
      this.dragDepth = 0;
      this.dropzoneEl.classList.remove("is-dragover");
    }
  }

  _handleDragOver(e) {
    e.preventDefault();
  }

  _handleDrop(e) {
    e.preventDefault()
    this.dragDepth = 0;
    this.dropzoneEl.classList.remove("is-dragover");
    this._addFiles(e.dataTransfer.files);
  }

  _handleInputChange(e) {
    this._addFiles(e.target.files);
  }

  _normalizeServerFile(fileData) {
    return {
      uiId: crypto.randomUUID(),
      source: "server",
      serverId: fileData.id,
      name: fileData.name,
      size: fileData.size ?? null,
      url: fileData.url,
      lastModified: fileData.lastModified ?? null,
      file: null
    }
  }

  _normalizeLocalFile(file) {
    return {
      uiId: crypto.randomUUID(),
      source: "local",
      serverId: null,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      lastModified: file.lastModified,
      file
    }
  }

  _renderFileElement(fileData) {
    const fileElement = document.createElement("li");
    fileElement.classList.add("form-file-list-item");
    fileElement.dataset.fileSource = fileData.source;
    fileElement.dataset.fileId = fileData.uiId;
    fileElement.innerHTML = `
      <span><i class="fa-solid fa-file"></i></span>
      <a data-file-name></a>
      <button type="button" class="form-file-remove-btn" data-action="removeFile">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    const fileExtension = fileData.name.split(".").pop().toLowerCase();
    const fileNameElement = fileElement.querySelector("[data-file-name]");
    fileNameElement.textContent = `${fileData.name.slice(0, 5)}...${fileExtension}`;
    fileNameElement.href = fileData.url;
    return fileElement;
  }

  _getFileElementsFragment(fileElements) {
    const fileElementsFragment = document.createDocumentFragment();
    fileElements.forEach(elem => fileElementsFragment.appendChild(elem));
    return fileElementsFragment;
  }

  _showFiles() {
    this.listEl.innerHTML = "";
    const filesElems = this.files.map(fileData => this._renderFileElement(fileData));
    const fileElementsFragment = this._getFileElementsFragment(filesElems);
    this.listEl.appendChild(fileElementsFragment);
  }

  _toggleHint() {
    if (!this.hintEl) return;
    this.hintEl.dataset.hidden = this.files.length > 0 ? "true" : "false";
  }

  _updateInputFiles() {
    const dt = new DataTransfer();
    const localFiles = this.files.filter(f => f.source === "local");
    localFiles.forEach(fileData => dt.items.add(fileData.file));
    this.inputEl.files = dt.files;
  }

  _addFiles(files) {
    const filtered = Array.from(files).filter(f => !this._isDuplicate(f));
    const incoming = filtered.map(file => this._normalizeLocalFile(file));
    this.files = [...this.files, ...incoming];

    this.files.forEach(fileData => this._addFileKey(fileData));
    this._toggleHint();
    this._updateInputFiles();
    this._showFiles();
  }

  _handleFileRemove(e) {
    const btn = e.target.closest("[data-action='removeFile']");
    if (!btn) return;
    const fileId = btn.closest("[data-file-id]")?.dataset?.fileId;

    const target = this.files.find(f => f.uiId === fileId);
    if (target.source === "local" && target.url) {
      URL.revokeObjectURL(target.url);
    }

    this.files = this.files.filter(f => {
      if (f.uiId !== fileId) return true;
      if (f.source === "server") this.removedServerFileIds.add(f.serverId);
      return false;
    });
    this.fileKeys.clear();
    this.files.forEach(fileData => this._addFileKey(fileData));
    this._updateInputFiles();
    this._showFiles();
    this._toggleHint();
  }

  _addFileKey(file) {
    this.fileKeys.add(`${file.name}::${file.size}::${file.lastModified}`);
  }

  _isDuplicate(file) {
    const fileKey = `${file.name}::${file.size}::${file.lastModified}`;
    return this.fileKeys.has(fileKey);
  }

  _removeEventListeners() {
    this.dropzoneEl.removeEventListener("dragenter", this.boundDragEnterHandler);
    this.dropzoneEl.removeEventListener("dragleave", this.boundDragLeaveHandler);
    this.dropzoneEl.removeEventListener("dragover", this.boundDragOverHandler);
    this.dropzoneEl.removeEventListener("drop", this.boundDragDropHandler);

    this.inputEl.removeEventListener("change", this.boundInputChangeHandler);
    this.listEl.removeEventListener("click", this.boundFileRemoveHandler);
  }
}

export default class LessonForm extends FormComponent {
  constructor({
                id = null,
                containerElement = null,
                successHandler = null,
                cancelHandler = null,
                moduleId = null,
                courseId = null,
                allowTemplateAutofill = false,
              }) {
    const mode = id ? "update" : "create";
    super({Service: LessonService, id, mode, containerElement});
    this.template = template;

    this.successUrl = "/admin/lessons";
    this.cancelUrl = "/admin/lessons";

    this.successHandler = successHandler ? successHandler : this.successHandler;
    this.cancelHandler = cancelHandler ? cancelHandler : this.cancelHandler;

    this.moduleId = moduleId;
    this.courseId = courseId;
    this.allowTemplateAutofill = allowTemplateAutofill;

    this.courseDetails = null;
    this.autofilledFields = new Set();
    this.boundLessonNumberInput = null;
    this.templatePreviewElement = null;
    this.templateMaterialsList = null;
    this.templateTestBadge = null;
  }

  getFormData() {
    const data = super.getFormData();

    if (this.moduleId !== null) {
      data.module_id = this.moduleId;
    }

    if (this.courseId !== null) {
      data.course_id = this.courseId;
    }

    data.removed_material_ids = this.filesController?.getRemovedServerFiles() ?? [];

    return data;
  }

  async fetchData() {
    if (!this.id) return;
    if (this.courseId === null) throw new Error("LessonForm: courseId is required for update mode");
    this.data = await this.Service.getById(this.courseId, this.id);
  }

  async submit(data) {
    if (this.courseId === null) throw new Error("LessonForm: courseId is required");
    if (this.mode === "create") {
      return await this.Service.create(this.courseId, data);
    }
    if (this.mode === "update") {
      return await this.Service.update(this.courseId, this.id, data);
    }
  }

  initCustomFields() {
    this.applyTemplateAutofillMode();
    this.initTemplateAutofill();

    const dropZone = this.form.querySelector("[data-drop-zone]");
    const dropInput = this.form.querySelector("[data-files-input]")
    const dropList = this.form.querySelector("[data-drop-file-list]");
    const dropHint = this.form.querySelector("[data-drop-hint]");
    if (!dropZone || !dropInput || !dropList) return;
    this.filesController = new FileDropzoneController({
      inputEl: dropInput,
      dropzoneEl: dropZone,
      listEl: dropList,
      hintEl: dropHint,
      serverFiles: this.data?.materials
    });
  }

  applyTemplateAutofillMode() {
    if (!this.allowTemplateAutofill || this.mode === "update") return;

    const titleInput = this.form?.querySelector('[name="title"]');
    const titleLabel = this.form?.querySelector('label[for="lesson-title"]');
    if (titleInput) {
      titleInput.required = false;
      titleInput.placeholder = "Можно оставить пустым: данные скопируются из шаблона, если урок найден";
    }
    if (titleLabel) {
      titleLabel.textContent = "Название урока (необязательно)";
    }
  }

  initTemplateAutofill() {
    if (!this.allowTemplateAutofill || this.mode === "update") return;

    this.templatePreviewElement = this.form?.querySelector("[data-template-preview]");
    this.templateMaterialsList = this.form?.querySelector("[data-template-materials-list]");
    this.templateTestBadge = this.form?.querySelector("[data-template-test-badge]");

    this.boundLessonNumberInput = async () => {
      await this.applyTemplateDefaults({ preserveManualValues: true });
    };

    const lessonNumberInput = this.form?.elements?.lesson_number;
    lessonNumberInput?.addEventListener("input", this.boundLessonNumberInput);

    this.preloadTemplateData()
      .then(() => this.applyTemplateDefaults({ preserveManualValues: false }))
      .catch((error) => console.error("LessonForm template preload error:", error));
  }

  async preloadTemplateData() {
    if (this.courseDetails || this.courseId === null) return;
    this.courseDetails = await CourseService.getById(this.courseId);
  }

  async applyTemplateDefaults({ preserveManualValues }) {
    await this.preloadTemplateData();
    if (!this.courseDetails || this.moduleId === null) return;

    const currentModule = this.courseDetails.modules?.find((module) => module.id === Number(this.moduleId));
    if (!currentModule) return;

    const lessonNumberField = this.form?.elements?.lesson_number;
    const currentValue = Number(lessonNumberField?.value);
    const lessonNumber = Number.isNaN(currentValue) || currentValue < 1
      ? this.getNextLessonNumber()
      : currentValue;

    if (lessonNumberField && (!preserveManualValues || lessonNumberField.value === "")) {
      lessonNumberField.value = String(lessonNumber);
    }

    const templateModule = this.courseDetails.template_modules?.find(
      (module) => module.module_number === currentModule.module_number
    );
    if (!templateModule) return;

    const matchedLesson = this.courseDetails.template_lessons?.find(
      (lesson) => lesson.module_id === templateModule.id && lesson.lesson_number === lessonNumber
    ) ?? null;
    if (!matchedLesson) {
      if (!preserveManualValues) {
        this.clearAutofilledFields();
      }
      this.renderTemplatePreview(null);
      return;
    }

    this.applyTemplateFields(matchedLesson, { preserveManualValues });
    this.renderTemplatePreview(matchedLesson);
  }

  getNextLessonNumber() {
    const lessonsInModule = (this.courseDetails?.lessons ?? [])
      .filter((lesson) => lesson.module_id === Number(this.moduleId));

    if (lessonsInModule.length === 0) return 1;

    return lessonsInModule.reduce((max, lesson) => Math.max(max, lesson.lesson_number), 0) + 1;
  }

  applyTemplateFields(templateLesson, { preserveManualValues }) {
    this.fillFieldFromTemplate("title", templateLesson.title, preserveManualValues);
    this.fillFieldFromTemplate("description", templateLesson.description, preserveManualValues);
    this.fillFieldFromTemplate("homework_text", templateLesson.homework_text, preserveManualValues);
  }

  fillFieldFromTemplate(fieldName, value, preserveManualValues) {
    const field = this.form?.elements?.[fieldName];
    if (!field) return;

    const shouldReplace = !preserveManualValues || this.autofilledFields.has(fieldName) || field.value.trim() === "";
    if (!shouldReplace) return;

    field.value = value ?? "";
    if (value) {
      this.autofilledFields.add(fieldName);
    } else {
      this.autofilledFields.delete(fieldName);
    }
  }

  clearAutofilledFields() {
    this.autofilledFields.forEach((fieldName) => {
      const field = this.form?.elements?.[fieldName];
      if (!field) return;
      field.value = "";
    });
    this.autofilledFields.clear();
  }

  renderTemplatePreview(templateLesson) {
    if (!this.templatePreviewElement || !this.templateMaterialsList || !this.templateTestBadge) return;

    if (!templateLesson) {
      this.templatePreviewElement.hidden = true;
      this.templateMaterialsList.innerHTML = "";
      this.templateTestBadge.hidden = true;
      return;
    }

    const materials = Array.isArray(templateLesson.materials) ? templateLesson.materials : [];
    const materialsMarkup = materials.length > 0
      ? materials.map((material) => {
          const extension = material.name.split(".").pop()?.toLowerCase() ?? "";
          return `
            <li class="teacher-template-preview__item">
              <span class="teacher-template-preview__file-icon"><i class="fa-solid fa-file"></i></span>
              <span class="teacher-template-preview__file-name">${material.name.slice(0, 5)}...${extension}</span>
            </li>
          `;
        }).join("")
      : `<li class="teacher-template-preview__item teacher-template-preview__item--muted">Материалов в шаблоне нет</li>`;

    this.templateMaterialsList.innerHTML = materialsMarkup;
    this.templateTestBadge.hidden = !templateLesson.test_id;
    this.templatePreviewElement.hidden = false;
  }

  handleEvents() {
    super.handleEvents();
    this?.filesController?.handleEvents();
  }

  destroy() {
    this.form?.elements?.lesson_number?.removeEventListener("input", this.boundLessonNumberInput);
    super.destroy();
    this?.filesController?.destroy();
  }
}
