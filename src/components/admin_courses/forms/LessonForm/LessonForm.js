import template from "./LessonForm.html?raw";
import FormComponent from "../../../../core/FormComponent.js";
import LessonService from "../../../../services/LessonService.js";


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

    data.removed_material_ids = this.filesController?.getRemovedServerFiles() ?? [];

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
      hintEl: dropHint,
      serverFiles: this.data?.materials
    });
  }

  handleEvents() {
    super.handleEvents();
    this?.filesController?.handleEvents();
  }

  destroy() {
    super.destroy();
    this?.filesController?.destroy();
  }
}
