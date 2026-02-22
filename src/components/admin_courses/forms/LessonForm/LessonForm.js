import template from "./LessonForm.html?raw";
import FormComponent from "../../../../core/FormComponent.js";
import LessonService from "../../../../services/LessonService.js";


class FileDropzoneController {
  constructor({inputEl, dropzoneEl, listEl, hintEl = null, filesList = []}) {
    if (!inputEl || !dropzoneEl || !listEl) {
      throw new Error("FileDropzoneController: InputEl & DropzoneEl & listEl must be provided");
    }

    this.inputEl = inputEl;
    this.dropzoneEl = dropzoneEl;
    this.listEl = listEl;
    this.hintEl = hintEl;
    this.filesList = filesList;
    this.fileKeys = new Set(this.filesList.map(fileData => {
      const file = fileData.file;
      return `${file.name}::${file.size}::${file.lastModified}`;
    }));

    this.dragDepth = 0;

    this.boundDragEnterHandler = null;
    this.boundDragLeaveHandler = null;
    this.boundDragOverHandler = null;
    this.boundDragDropHandler = null;
    this.boundInputChangeHandler = null;
    this.boundFileRemoveHandler = null;

    this.init();
  }

  init() {
    this._showFiles();
    this._updateInputFiles();
  }

  handleDragEnter() {
    this.dragDepth += 1;
    this.dropzoneEl.classList.add("is-dragover");
  }

  handleDragLeave() {
    this.dragDepth -= 1;
    if (this.dragDepth <= 0) {
      this.dragDepth = 0;
      this.dropzoneEl.classList.remove("is-dragover");
    }
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDrop(e) {
    e.preventDefault()
    this.dragDepth = 0;
    this.dropzoneEl.classList.remove("is-dragover");

    this._addFiles(e.dataTransfer.files);
  }

  handleInputChange(e) {
    this._addFiles(e.target.files);
  }

  handleEvents() {
    this.boundDragEnterHandler = () => this.handleDragEnter();
    this.boundDragLeaveHandler = () => this.handleDragLeave();
    this.boundDragOverHandler = (e) => this.handleDragOver(e);
    this.boundDragDropHandler = (e) => this.handleDrop(e);
    this.boundInputChangeHandler = (e) => this.handleInputChange(e);
    this.boundFileRemoveHandler = (e) => this._handleFileRemove(e);

    this.dropzoneEl.addEventListener("dragenter", this.boundDragEnterHandler);
    this.dropzoneEl.addEventListener("dragleave", this.boundDragLeaveHandler);
    this.dropzoneEl.addEventListener("dragover", this.boundDragOverHandler);
    this.dropzoneEl.addEventListener("drop", this.boundDragDropHandler);

    this.inputEl.addEventListener("change", this.boundInputChangeHandler);

    this.listEl.addEventListener("click", this.boundFileRemoveHandler);
  }

  removeEventListeners() {
    this.dropzoneEl.removeEventListener("dragenter", this.boundDragEnterHandler);
    this.dropzoneEl.removeEventListener("dragleave", this.boundDragLeaveHandler);
    this.dropzoneEl.removeEventListener("dragover", this.boundDragOverHandler);
    this.dropzoneEl.removeEventListener("drop", this.boundDragDropHandler);

    this.inputEl.removeEventListener("change", this.boundInputChangeHandler);

    this.listEl.removeEventListener("click", this.boundFileRemoveHandler);
  }

  _renderFileElement(fileData) {
    const fileElement = document.createElement("li");
    fileElement.classList.add("form-file-list-item");
    fileElement.dataset.fileId = fileData.id;
    fileElement.innerHTML = `
      <span><i class="fa-solid fa-file"></i></span>
      <span data-file-name></span>
      <button type="button" class="form-file-remove-btn" data-action="removeFile">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    const fileExtension = fileData.file.name.split(".").pop().toLowerCase();
    const fileNameElement = fileElement.querySelector("[data-file-name]");
    fileNameElement.textContent = `${fileData.file.name.slice(0, 5)}...${fileExtension}`;

    return fileElement;
  }

  _getFileElementsFragment(fileElements) {
    const fileElementsFragment = document.createDocumentFragment();
    fileElements.forEach(elem => fileElementsFragment.appendChild(elem));
    return fileElementsFragment;
  }

  _showFiles() {
    this.listEl.innerHTML = "";
    const fileElements = this.filesList.map(fileData => this._renderFileElement(fileData));
    const fileElementsFragment = this._getFileElementsFragment(fileElements);
    this.listEl.appendChild(fileElementsFragment);
  }

  _toggleHint() {
    if (!this.hintEl) return;

    if (this.filesList.length > 0) {
      this.hintEl.dataset.hidden = "true";
    } else {
      this.hintEl.dataset.hidden = "false";
    }
  }

  _updateInputFiles() {
    const dt = new DataTransfer();
    this.filesList.forEach(fileData => dt.items.add(fileData.file));
    this.inputEl.files = dt.files;
  }

  _addFiles(files) {
    const filtered = Array.from(files).filter(f => !this._isDuplicate(f));
    const incoming = filtered.map(file => ({id: crypto.randomUUID(), file}));
    this.filesList = [...this.filesList, ...incoming];

    this.filesList.forEach(fileData => this._addFileKey(fileData.file));

    this._toggleHint();
    this._updateInputFiles();
    this._showFiles();
  }

  _handleFileRemove(e) {
    const btn = e.target.closest("[data-action='removeFile']");
    if (!btn) return;
    const fileId = btn.closest("[data-file-id]")?.dataset?.fileId;
    this.filesList = this.filesList.filter(fileData => fileData.id !== fileId);
    this.fileKeys.clear();
    this.filesList.forEach(fileData => this._addFileKey(fileData.file));
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
}

export default class LessonForm extends FormComponent {
  constructor({
                id = null,
                containerElement = null,
                successHandler = null,
                cancelHandler = null,
                moduleId = null,
                courseId = null
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
  }

  getFormData() {
    const data = super.getFormData();
    if (this.moduleId !== null) {
      data.module_id = this.moduleId;
    }

    if (this.courseId !== null) {
      data.course_id = this.courseId;
    }
    return data;
  }

  initCustomFields() {
    const dropZone = this.form.querySelector("[data-drop-zone]");
    const dropInput = this.form.querySelector("[data-files-input]")
    const dropList = this.form.querySelector("[data-drop-file-list]");
    const dropHint = this.form.querySelector("[data-drop-hint]");
    if (!dropZone || !dropInput || !dropList) return;
    this.filesController = new FileDropzoneController({
      inputEl: dropInput,
      dropzoneEl: dropZone,
      listEl: dropList,
      hintEl: dropHint
    });
  }

  handleEvents() {
    super.handleEvents();
    this?.filesController?.handleEvents();
  }

  destroy() {
    super.destroy();
    this?.filesController?.removeEventListeners();
  }
}