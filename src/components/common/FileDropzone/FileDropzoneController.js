import { handleAuthenticatedFileLinkClick } from "../../../utils/fileDownload.js";

export default class FileDropzoneController {
  constructor({ inputEl, dropzoneEl, listEl, hintEl = null, serverFiles = [] }) {
    if (!inputEl || !dropzoneEl || !listEl) {
      throw new Error("FileDropzoneController: InputEl & DropzoneEl & listEl must be provided");
    }

    this.inputEl = inputEl;
    this.dropzoneEl = dropzoneEl;
    this.listEl = listEl;
    this.hintEl = hintEl;

    this.files = serverFiles.map((fileData) => this._normalizeServerFile(fileData));
    this.removedServerFileIds = new Set();
    this.fileKeys = new Set(this.files.map((file) => `${file.name}::${file.size}::${file.lastModified}`));

    this.dragDepth = 0;

    this.boundDragEnterHandler = null;
    this.boundDragLeaveHandler = null;
    this.boundDragOverHandler = null;
    this.boundDragDropHandler = null;
    this.boundInputChangeHandler = null;
    this.boundFileRemoveHandler = null;
    this.boundFileDownloadHandler = null;

    this._init();
  }

  handleEvents() {
    this.boundDragEnterHandler = () => this._handleDragEnter();
    this.boundDragLeaveHandler = () => this._handleDragLeave();
    this.boundDragOverHandler = (event) => this._handleDragOver(event);
    this.boundDragDropHandler = (event) => this._handleDrop(event);
    this.boundInputChangeHandler = (event) => this._handleInputChange(event);
    this.boundFileRemoveHandler = (event) => this._handleFileRemove(event);
    this.boundFileDownloadHandler = (event) => handleAuthenticatedFileLinkClick(event);

    this.dropzoneEl.addEventListener("dragenter", this.boundDragEnterHandler);
    this.dropzoneEl.addEventListener("dragleave", this.boundDragLeaveHandler);
    this.dropzoneEl.addEventListener("dragover", this.boundDragOverHandler);
    this.dropzoneEl.addEventListener("drop", this.boundDragDropHandler);

    this.inputEl.addEventListener("change", this.boundInputChangeHandler);
    this.listEl.addEventListener("click", this.boundFileRemoveHandler);
    this.listEl.addEventListener("click", this.boundFileDownloadHandler);
  }

  getRemovedServerFiles() {
    return Array.from(this.removedServerFileIds);
  }

  getLocalFiles() {
    return this.files
      .filter((fileData) => fileData.source === "local")
      .map((fileData) => fileData.file);
  }

  destroy() {
    this._removeEventListeners();
    this.files.forEach((file) => {
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

  _handleDragOver(event) {
    event.preventDefault();
  }

  _handleDrop(event) {
    event.preventDefault();
    this.dragDepth = 0;
    this.dropzoneEl.classList.remove("is-dragover");
    this._addFiles(event.dataTransfer.files);
  }

  _handleInputChange(event) {
    this._addFiles(event.target.files);
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
      file: null,
    };
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
      file,
    };
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
    fileNameElement.dataset.downloadName = fileData.name;
    if (fileData.source === "server") {
      fileNameElement.dataset.authDownload = "";
    } else {
      fileNameElement.download = fileData.name;
    }
    return fileElement;
  }

  _showFiles() {
    this.listEl.innerHTML = "";
    const fileElementsFragment = document.createDocumentFragment();
    this.files
      .map((fileData) => this._renderFileElement(fileData))
      .forEach((element) => fileElementsFragment.appendChild(element));
    this.listEl.appendChild(fileElementsFragment);
  }

  _toggleHint() {
    if (!this.hintEl) return;
    this.hintEl.dataset.hidden = this.files.length > 0 ? "true" : "false";
  }

  _updateInputFiles() {
    const dataTransfer = new DataTransfer();
    const localFiles = this.files.filter((fileData) => fileData.source === "local");
    localFiles.forEach((fileData) => dataTransfer.items.add(fileData.file));
    this.inputEl.files = dataTransfer.files;
  }

  _addFiles(files) {
    const filteredFiles = Array.from(files).filter((file) => !this._isDuplicate(file));
    const incomingFiles = filteredFiles.map((file) => this._normalizeLocalFile(file));
    this.files = [...this.files, ...incomingFiles];

    this.files.forEach((fileData) => this._addFileKey(fileData));
    this._toggleHint();
    this._updateInputFiles();
    this._showFiles();
  }

  _handleFileRemove(event) {
    const button = event.target.closest("[data-action='removeFile']");
    if (!button) return;
    const fileId = button.closest("[data-file-id]")?.dataset?.fileId;

    const target = this.files.find((fileData) => fileData.uiId === fileId);
    if (target?.source === "local" && target.url) {
      URL.revokeObjectURL(target.url);
    }

    this.files = this.files.filter((fileData) => {
      if (fileData.uiId !== fileId) return true;
      if (fileData.source === "server") this.removedServerFileIds.add(fileData.serverId);
      return false;
    });

    this.fileKeys.clear();
    this.files.forEach((fileData) => this._addFileKey(fileData));
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
    this.listEl.removeEventListener("click", this.boundFileDownloadHandler);
  }
}
