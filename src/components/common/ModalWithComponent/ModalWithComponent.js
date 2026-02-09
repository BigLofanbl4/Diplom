import template from "./ModalWithComponent.html?raw";

export default class ModalWithComponent {
  constructor(
    {
      Component,
      componentProps = {},
      title = ""
    }) {
    this.template = template;
    this.title = title;
    this.Component = Component;
    this.componentProps = componentProps;
    this.componentInstance = null;
    this.componentContainer = null;
    this.modal = null;
    this.boundClickHandler = null;
  }

  async mount() {
    this._createModal();
    this._applyTitle();
    await this._mountComponent();
    this.modal.dataset.hidden = "false";
  }

  handleEvents() {
    this.boundClickHandler = (e) => {
      const isClose = e.target.closest("[data-action='close']");
      const isBackdrop = e.target === this.modal;

      if (isClose || isBackdrop) {
        this.destroy();
      }
    };

    this.modal.addEventListener("click", this.boundClickHandler);
  }

  async draw() {
    await this.mount();
    this.handleEvents();
  }

  destroy() {
    if (!this.modal) return;
    this.modal.removeEventListener("click", this.boundClickHandler);
    this._playCloseAnimation(() => {
      this.componentInstance?.destroy()
      this.modal.remove();
    });
  }

  _playCloseAnimation(onDone) {
    this.modal.dataset.hidden = "true";

    const handleEnd = (event) => {
      if (event.target !== this.modal) return;
      this.modal.removeEventListener("animationend", handleEnd)
      onDone?.();
    };

    this.modal.addEventListener("animationend", handleEnd);
  }

  _createModal() {
    const modalWrapper = document.createElement("div");
    modalWrapper.innerHTML = this.template;

    this.modal = modalWrapper.firstElementChild;
    document.body.appendChild(this.modal);

    this.modal.querySelector(".modal__title").textContent = this.title;
  }

  _applyTitle() {
    const titleElement = this.modal.querySelector(".modal__title");
    if (titleElement) titleElement.textContent = this.title;
  }

  async _mountComponent() {
    this.componentContainer = this.modal.querySelector(".modal__component");
    this.componentInstance = new this.Component({
      ...this.componentProps,
      containerElement: this.componentContainer
    });

    if (!this.componentInstance) return;
    await this.componentInstance.draw();
  }
}