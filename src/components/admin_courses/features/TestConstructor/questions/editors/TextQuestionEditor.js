import { clearFieldErrors, showFieldError } from "../../../../../../utils/formUtils.js";
import { createTextQuestionBody } from "../templates/questionFormTemplates.js";

export class TextQuestionEditor {
  constructor({ questionData, formElement }) {
    this.questionData = questionData;
    this.formElement = formElement;
    this.questionBodyElement = null;
  }

  render() {
    this.questionBodyElement = createTextQuestionBody(this.questionData);
    return this.questionBodyElement;
  }

  mount() {
    if (!this.formElement) throw new Error("No form element found");
    if (!this.questionBodyElement) this.render();
    this.formElement.insertAdjacentElement("afterbegin", this.questionBodyElement);
  }

  validateQuestionDraft(draft) {
    const result = {
      ok: true,
      errors: [],
    };

    if (String(draft.text).trim() === "") {
      result.ok = false;
      result.errors.push({ type: "empty_condition", message: "Пустой текст вопроса" });
    }

    if (String(draft.answer).trim() === "") {
      result.ok = false;
      result.errors.push({ type: "empty_answer", message: "Пустой ответ на вопрос" });
    }

    return result;
  }

  showValidation(errors) {
    const errorHandlers = {
      empty_condition: (error) => {
        const questionTextInput = this.formElement.querySelector('[name="text"]');
        showFieldError({ field: questionTextInput, message: error.message });
      },
      empty_answer: (error) => {
        const questionAnswerInput = this.formElement.querySelector('[name="answer"]');
        showFieldError({ field: questionAnswerInput, message: error.message });
      },
    };

    errors.forEach((error) => errorHandlers[error.type]?.(error));
  }

  clearValidation() {
    clearFieldErrors(this.formElement);
  }

  getQuestionDraft() {
    const draft = {};
    const questionText = this.questionBodyElement.querySelector("[data-question-text]").value;
    const questionAnswer = this.questionBodyElement.querySelector("[data-question-answer]").value;
    draft.uiId = this.questionData.uiId;
    draft.type = "text";
    draft.text = questionText;
    draft.answer = [questionAnswer.toLowerCase().trim()];
    return draft;
  }
}
