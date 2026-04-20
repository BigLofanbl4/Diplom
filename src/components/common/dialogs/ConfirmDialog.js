export default class ConfirmDialog {
  constructor({
    title = "Подтвердите действие",
    message = "",
    confirmText = "Подтвердить",
    cancelText = "Отмена",
    variant = "danger",
  } = {}) {
    this.title = title;
    this.message = message;
    this.confirmText = confirmText;
    this.cancelText = cancelText;
    this.variant = variant;

    this.root = null;
    this.cancelButton = null;
    this.confirmButton = null;
    this.boundClickHandler = null;
    this.boundKeydownHandler = null;
    this.resolve = null;
  }

  show() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.render();
      this.attachEvents();
      document.body.appendChild(this.root);
      requestAnimationFrame(() => {
        this.root.dataset.state = "open";
        this.cancelButton?.focus();
      });
    });
  }

  render() {
    const root = document.createElement("div");
    root.className = "dialog-backdrop";
    root.dataset.state = "hidden";

    root.innerHTML = `
      <div class="dialog dialog--${this.variant}" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="dialog__badge" aria-hidden="true">
          <i class="fa-solid ${this.variant === "danger" ? "fa-trash-can" : "fa-circle-question"}"></i>
        </div>
        <div class="dialog__body">
          <h2 class="dialog__title" id="dialog-title"></h2>
          <p class="dialog__message"></p>
        </div>
        <div class="dialog__actions">
          <button type="button" class="btn btn-secondary" data-action="cancel"></button>
          <button type="button" class="btn ${this.variant === "danger" ? "btn-danger" : "btn-primary"}" data-action="confirm"></button>
        </div>
      </div>
    `;

    this.root = root;
    this.cancelButton = root.querySelector("[data-action='cancel']");
    this.confirmButton = root.querySelector("[data-action='confirm']");
    root.querySelector(".dialog__title").textContent = this.title;
    root.querySelector(".dialog__message").textContent = this.message;
    this.cancelButton.textContent = this.cancelText;
    this.confirmButton.textContent = this.confirmText;
  }

  attachEvents() {
    this.boundClickHandler = (event) => {
      const confirmButton = event.target.closest("[data-action='confirm']");
      const cancelButton = event.target.closest("[data-action='cancel']");
      const isBackdrop = event.target === this.root;

      if (confirmButton) {
        this.close(true);
      }

      if (cancelButton || isBackdrop) {
        this.close(false);
      }
    };

    this.boundKeydownHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close(false);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        this.close(true);
      }
    };

    this.root.addEventListener("click", this.boundClickHandler);
    document.addEventListener("keydown", this.boundKeydownHandler);
  }

  close(result) {
    if (!this.root) {
      this.resolve?.(result);
      return;
    }

    this.root.removeEventListener("click", this.boundClickHandler);
    document.removeEventListener("keydown", this.boundKeydownHandler);
    this.root.dataset.state = "closing";

    const currentRoot = this.root;
    const finalize = () => {
      currentRoot.removeEventListener("animationend", finalize);
      currentRoot.remove();
      this.root = null;
      this.resolve?.(result);
    };

    currentRoot.addEventListener("animationend", finalize);
  }
}
