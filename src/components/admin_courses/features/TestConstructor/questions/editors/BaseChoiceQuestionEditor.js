import { clearFieldErrors, showFieldError } from "../../../../../../utils/formUtils.js";
import {
  createMultipleChoiceQuestionBody,
  createSingleChoiceQuestionBody,
} from "../templates/questionFormTemplates.js";

export class BaseChoiceQuestionEditor {
  constructor({ questionData, formElement, inputType }) {
    if (inputType !== "checkbox" && inputType !== "radio") {
      throw new Error(`Unsupported choice type: ${inputType}`);
    }

    this.questionData = questionData;
    this.formElement = formElement;
    this.inputType = inputType;
    this.questionBodyElement = null;
    this.options = structuredClone(this.questionData?.options) || [];

    const questionBodyTemplateMap = {
      checkbox: createMultipleChoiceQuestionBody,
      radio: createSingleChoiceQuestionBody,
    };
    this.createQuestionBody = questionBodyTemplateMap[inputType];

    const questionTypeMap = {
      checkbox: "multiple_choice",
      radio: "single_choice",
    };
    this.questionType = questionTypeMap[inputType];
  }

  render() {
    this.questionBodyElement = this.createQuestionBody(this.questionData);
    return this.questionBodyElement;
  }

  mount() {
    if (!this.formElement) throw new Error("No form element found");
    if (!this.questionBodyElement) this.render();
    this.formElement.insertAdjacentElement("afterbegin", this.questionBodyElement);
  }

  validateQuestionDraft() {
    throw new Error("Not implemented");
  }

  showValidation(errors) {
    const errorHandlers = {
      empty_condition: (error) => {
        const questionTextInput = this.formElement.querySelector('[name="text"]');
        showFieldError({ field: questionTextInput, message: error.message });
      },
      empty_options: (error) => {
        const optionsErrorContainer = this.formElement.querySelector("[data-options-error]");
        showFieldError({ field: optionsErrorContainer, message: error.message, position: "beforeend" });
      },
      empty_answer: (error) => {
        const optionsErrorContainer = this.formElement.querySelector("[data-options-error]");
        showFieldError({ field: optionsErrorContainer, message: error.message, position: "beforeend" });
      },
    };

    errors.forEach((error) => errorHandlers[error.type]?.(error));
  }

  clearValidation() {
    clearFieldErrors(this.formElement);
  }

  getQuestionAnswer() {
    throw new Error("Not implemented");
  }

  getQuestionDraft() {
    const draft = {};
    const questionText = this.questionBodyElement.querySelector("[data-question-text]").value;
    draft.uiId = this.questionData.uiId;
    draft.type = this.questionType;
    draft.text = questionText;
    draft.answer = this.getQuestionAnswer();
    draft.options = this.options;
    return draft;
  }

  handleEvents() {
    const questionOptions = this.questionBodyElement.querySelector(".question__answer-options");
    const addOptionButton = this.questionBodyElement.querySelector("[data-action='addOption']");
    addOptionButton.addEventListener("click", () => {
      const optionInput = this.questionBodyElement.querySelector("[data-option-input]");
      const value = optionInput.value;
      if (!value) return;

      const option = { text: value, value: value.trim() };
      this.options.push(option);
      questionOptions.appendChild(this.createOptionElement(option));
      optionInput.value = "";
    });
  }

  createOptionElement(option) {
    const optionElement = document.createElement("li");
    const optionLabel = document.createElement("label");
    const optionInput = document.createElement("input");

    optionLabel.textContent = option.text;
    optionLabel.htmlFor = `answer-${this.options.length}`;

    optionInput.type = this.inputType;
    optionInput.value = option.value;
    optionInput.name = "answer";
    optionInput.id = `answer-${this.options.length}`;

    optionElement.appendChild(optionLabel);
    optionElement.appendChild(optionInput);

    return optionElement;
  }
}
