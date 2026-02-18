import {
  BaseQuestionFormTemplate,
  TextQuestionFormTemplate,
  TextQuestionTemplate,
  SingleChoiceQuestionFormTemplate,
  SingleChoiceQuestionTemplate, MultipleChoiceQuestionTemplate, MultipleChoiceQuestionFormTemplate,
} from "./Questions.template.js";
import {showFieldError, clearFieldErrors} from "../../../utils/formUtils.js";

export class QuestionConstructor {
  constructor({
                questionType,
                questionData = null,
                containerElement,
                onSuccess = null,
                onCancel = null
              }) {
    this.questionData = questionData ? questionData : QuestionTypeRegistry[questionType].createEmptyDraft();

    this.Editor = QuestionTypeRegistry?.[questionType].Editor;
    if (!this.Editor) throw new Error(`Question type "${questionType}" not found.`);
    this.questionInstance = null;


    if (!containerElement) throw new Error("No container element found");
    this.containerElement = containerElement;
    this.questionForm = null;

    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
  }

  render() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = BaseQuestionFormTemplate();
    this.questionForm = wrapper.querySelector('[data-question-form]');
    this.questionInstance = new this.Editor({
      questionData: this.questionData,
      formElement: this.questionForm
    });
    this.questionInstance.render();
  }

  mount() {
    this.questionInstance.mount();
    this.questionInstance?.handleEvents?.();
    this.containerElement.appendChild(this.questionForm);
  }

  _validateQuestionDraft(draft) {
    return this.questionInstance.validateQuestionDraft(draft);
  }

  _getQuestionDraft() {
    return this.questionInstance.getQuestionDraft();
  }

  handleEvents() {
    this.questionForm.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      switch (action) {
        case 'cancel':
          return this.onCancel?.();
      }
    });

    this.questionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const draft = this._getQuestionDraft();
      this.questionInstance.clearValidation();
      const isValid = this._validateQuestionDraft(draft);
      if (!isValid.ok) {
        this.questionInstance.showValidation(isValid.errors);
        return;
      }
      return this.onSuccess?.(draft);
    });
  }

  draw() {
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    if (this.questionForm) {
      this.questionForm.remove();
    }
  }

}

export class TextQuestion {
  constructor({questionData, formElement}) {
    this.questionData = questionData;
    this.formElement = formElement;
    this.questionBodyElem = null;
  }

  render() {
    this.questionBodyElem = TextQuestionFormTemplate(this.questionData);
    return this.questionBodyElem
  }

  mount() {
    if (!this.formElement) throw new Error("No form element found");
    if (!this.questionBodyElem) this.render();
    this.formElement.insertAdjacentElement("afterbegin", this.questionBodyElem);
  }

  validateQuestionDraft(draft) {
    const result = {
      ok: true,
      errors: []
    };

    if (String(draft.text).trim() === "") {
      result.ok = false;
      result.errors.push({type: "empty_condition", message: "Пустой текст вопроса"});
    }

    if (String(draft.answer).trim() === "") {
      result.ok = false;
      result.errors.push({type: "empty_answer", message: "Пустой ответ на вопрос"});
    }

    return result
  }

  showValidation(errors) {
    const errorsTypeMap = {
      "empty_condition": (error) => {
        const questionTextInp = this.formElement.querySelector('[name="text"]');
        showFieldError({field: questionTextInp, message: error.message});
      },
      "empty_answer": (error) => {
        const questionAnswerInp = this.formElement.querySelector('[name="answer"]');
        showFieldError({field: questionAnswerInp, message: error.message});
      }
    };

    errors.forEach(error => errorsTypeMap[error.type]?.(error));
  }

  clearValidation() {
    clearFieldErrors(this.formElement);
  }

  getQuestionDraft() {
    const draft = {};
    const questionText = this.questionBodyElem.querySelector('[data-question-text]').value;
    const questionAnswer = this.questionBodyElem.querySelector('[data-question-answer]').value;
    draft.id = this.questionData.id;
    draft.type = "text";
    draft.text = questionText;
    draft.answer = questionAnswer.toLowerCase().trim();
    return draft;
  }
}

class BaseChoiceQuestion {
  constructor({questionData, formElement, inputType}) {
    if (inputType !== "checkbox" && inputType !== "radio") {
      throw new Error(`Unsupported choice type: ${inputType}`);
    }

    this.questionData = questionData;
    this.questionBodyElem = null;
    this.formElement = formElement;
    this.options = structuredClone(this.questionData?.options) || [];
    this.inputType = inputType;

    const formTemplateMap = {
      checkbox: MultipleChoiceQuestionFormTemplate,
      radio: SingleChoiceQuestionFormTemplate
    };
    this.FormTemplate = formTemplateMap[inputType];

    const questionTypeMap = {
      checkbox: "multiple_choice",
      radio: "single_choice"
    };
    this.questionType = questionTypeMap[inputType];
  }

  render() {
    this.questionBodyElem = this.FormTemplate(this.questionData);
    return this.questionBodyElem;
  }

  mount() {
    if (!this.formElement) throw new Error("No form element found");
    if (!this.questionBodyElem) this.render();
    this.formElement.insertAdjacentElement("afterbegin", this.questionBodyElem);
  }

  validateQuestionDraft(draft) {
    throw new Error("Not implemented");
  }

  showValidation(errors) {
    const errorsTypeMap = {
      "empty_condition": (error) => {
        const questionTextInp = this.formElement.querySelector('[name="text"]');
        questionTextInp.classList.add('invalid');
        showFieldError({field: questionTextInp, message: error.message});
      },
      "empty_options": (error) => {
        const optionsErrorContainer= this.formElement.querySelector('[data-options-error]');
        showFieldError({field: optionsErrorContainer, message: error.message, position: "beforeend"});
      },
      "empty_answer": (error) => {
        const optionsErrorContainer= this.formElement.querySelector('[data-options-error]');
        showFieldError({field: optionsErrorContainer, message: error.message, position: "beforeend"});
      }
    };

    errors.forEach(error => errorsTypeMap[error.type]?.(error));
  }

  clearValidation() {
    clearFieldErrors(this.formElement);
    const invalidFields = this.formElement.querySelectorAll('.invalid');
    invalidFields.forEach(elem => elem.classList.remove("invalid"));
  }

  getQuestionAnswer() {
    throw new Error("Not implemented");
  }

  getQuestionDraft() {
    const draft = {};
    const questionText = this.questionBodyElem.querySelector('[data-question-text]').value;
    draft.id = this.questionData.id;
    draft.type = this.questionType;
    draft.text = questionText;
    draft.answer = this.getQuestionAnswer();
    draft.options = this.options;
    return draft;
  }

  handleEvents() {
    const questionOptions = this.questionBodyElem.querySelector('.question__answer-options');
    const addOptionBtn = this.questionBodyElem.querySelector("[data-action='addOption']");
    addOptionBtn.addEventListener("click", (e) => {
      const value = this.questionBodyElem.querySelector('[data-option-input]').value;
      if (!value) return;
      const option = {text: value, value: value.trim()};
      this.options.push(option);
      questionOptions.appendChild(this._addOption(option));
      this.questionBodyElem.querySelector('[data-option-input]').value = '';
    });
  }

  _addOption(option) {
    const container = document.createElement("li");
    const label = document.createElement("label");
    const input = document.createElement("input");

    label.textContent = option.text;
    label.htmlFor = `answer-${this.options.length}`;

    input.type = this.inputType;
    input.value = option.value;
    input.name = "answer";
    input.id = `answer-${this.options.length}`;

    container.appendChild(label);
    container.appendChild(input);

    return container;
  }
}

export class SingleChoiceQuestion extends BaseChoiceQuestion {
  constructor({questionData, formElement}) {
    super({questionData, formElement, inputType: "radio"});
  }

  validateQuestionDraft(draft) {
    const result = {ok: true, errors: []};
    if (String(draft.text).trim() === "") {
      result.ok = false;
      result.errors.push({type: "empty_condition", message: "Пустой текст вопроса"});
    }

    if (!Array.isArray(draft.options) || draft.options?.length === 0) {
      result.ok = false;
      result.errors.push({type: "empty_options", message: "Отсутствуют варианты ответов на вопрос"});
      return result;
    }

    if (String(draft.answer).trim() === "") {
      result.ok = false;
      result.errors.push({type: "empty_answer", message: "Пустой ответ на вопрос"});
    }

    return result;
  }

  getQuestionAnswer() {
    return this.questionBodyElem.querySelector('input[name="answer"]:checked')?.value ?? "";
  }


}

export class MultipleChoiceQuestion extends BaseChoiceQuestion {
  constructor({questionData = null, formElement}) {
    super({questionData, formElement, inputType: "checkbox"});
  }

  validateQuestionDraft(draft) {
    const result = {ok: true, errors: []};
    if (String(draft.text).trim() === "") {
      result.ok = false;
      result.errors.push({type: "empty_condition", message: "Пустой текст вопроса"});
    }

    if (!Array.isArray(draft.options) || draft.options?.length === 0) {
      result.ok = false;
      result.errors.push({type: "empty_options", message: "Отсутствуют выборы ответа"});
      return result;
    }

    if (!Array.isArray(draft.answer) || draft.answer?.length === 0) {
      result.ok = false;
      result.errors.push({type: "empty_answer", message: "Отсутствует выбранный ответ"});
    }

    return result;
  }

  getQuestionAnswer() {
    const questionAnswerElems = this.questionBodyElem.querySelectorAll('input[name="answer"]:checked');
    return Array.from(questionAnswerElems).map(e => e.value.trim());
  }
}

export function QuestionRenderer(questionData) {
  const questionType = questionData.type;
  return QuestionTypeRegistry[questionType].renderCard(questionData);
}

function createQuestionId() {
  return crypto.randomUUID();
}

const QuestionTypeRegistry = {
  text: {
    Editor: TextQuestion,
    renderCard: TextQuestionTemplate,
    createEmptyDraft: () => ({id: createQuestionId(), type: "text", text: "", answer: ""})
  },
  single_choice: {
    Editor: SingleChoiceQuestion,
    renderCard: SingleChoiceQuestionTemplate,
    createEmptyDraft: () => ({id: createQuestionId(), type: "single_choice", text: "", answer: "", options: []})
  },
  multiple_choice: {
    Editor: MultipleChoiceQuestion,
    renderCard: MultipleChoiceQuestionTemplate,
    createEmptyDraft: () => ({id: createQuestionId(), type: "multiple_choice", text: "", answer: [], options: []})
  }
};