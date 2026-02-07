import template from "./ModalWithComponent.html?raw";

export default class ModalWithComponent {
  constructor(
    {
      Component,
      componentProps = {},
      modalSelector = ".modal"
    }) {
    this.template = template;
    this.Component = Component;
    this.componentProps = componentProps;
    this.componentInstance = null;
    this.modalSelector = modalSelector;
    this.modal = null;
    this.boundClickHandler = null;
  }

  async mount() {
    document.querySelector("body").insertAdjacentHTML("afterbegin", this.template);
    this.componentInstance = new this.Component(this.componentProps);
    await this.componentInstance.draw();
    this.modal = document.querySelector(this.modalSelector);
    this.modal.dataset.hidden = "false";
  }

  handleEvents() {
    this.boundClickHandler = (e) => {
      if (e.target.getAttribute("id") === "modal") {
        this.destroy();
      } else if (e.target.closest("[data-action]")?.dataset.action === "close") {
        this.destroy();
      }
    };

    document.addEventListener("click", this.boundClickHandler);
  }

  async draw() {
    await this.mount();
    this.handleEvents();
  }

  destroy() {
    if (this.modal) {
      this.modal.dataset.hidden = "true";
      this.modal.addEventListener("animationend", () => {
        if (this.componentInstance) this.componentInstance.destroy();
        this.modal.remove();
      });
    }
    if (this.boundClickHandler) {
      document.removeEventListener("click", this.boundClickHandler);
    }
  }
}