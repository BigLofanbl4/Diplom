import { QUESTION_TYPE_REGISTRY } from "./questionTypeRegistry.js";
import { renderQuestionFormShell } from "./templates/questionFormTemplates.js";

export class QuestionEditorForm {
  constructor({ questionType, questionData = null, containerElement, onSuccess = null, onCancel = null }) {
    const typeConfig = QUESTION_TYPE_REGISTRY[questionType];
    if (!typeConfig) throw new Error(`Question type "${questionType}" not found.`);

    if (!containerElement) throw new Error("No container element found");

    this.questionData = questionData ? questionData : typeConfig.createEmptyDraft();
    this.Editor = typeConfig.Editor;
    this.containerElement = containerElement;
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;

    this.questionFormElement = null;
    this.questionEditor = null;
  }

  render() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = renderQuestionFormShell();

    this.questionFormElement = wrapper.querySelector("[data-question-form]");
    this.questionEditor = new this.Editor({
      questionData: this.questionData,
      formElement: this.questionFormElement,
    });
    this.questionEditor.render();
  }

  mount() {
    this.questionEditor.mount();
    this.questionEditor?.handleEvents?.();
    this.containerElement.appendChild(this.questionFormElement);
  }

  validateQuestionDraft(draft) {
    return this.questionEditor.validateQuestionDraft(draft);
  }

  getQuestionDraft() {
    return this.questionEditor.getQuestionDraft();
  }

  handleEvents() {
    this.questionFormElement.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      if (action === "cancel") {
        this.onCancel?.();
      }
    });

    this.questionFormElement.addEventListener("submit", (event) => {
      event.preventDefault();

      const draft = this.getQuestionDraft();
      this.questionEditor.clearValidation();
      const validationResult = this.validateQuestionDraft(draft);

      if (!validationResult.ok) {
        this.questionEditor.showValidation(validationResult.errors);
        return;
      }

      this.onSuccess?.(draft);
    });
  }

  draw() {
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    if (this.questionFormElement) {
      this.questionFormElement.remove();
    }
  }
}
