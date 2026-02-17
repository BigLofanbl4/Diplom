import {
  BaseQuestionFormTemplate,
  TextQuestionFormTemplate,
  TextQuestionTemplate,
  SingleChoiceQuestionFormTemplate,
  SingleChoiceQuestionTemplate, MultipleChoiceQuestionTemplate, MultipleChoiceQuestionFormTemplate,
} from "./Questions.template.js";

function createQuestionId() {
  return crypto.randomUUID();
}

export class QuestionConstructor {
  constructor({
                QuestionType,
                questionData = null,
                containerElement,
                onSuccess = null,
                onCancel = null
              }) {
    this.questionData = questionData;
    this.QuestionType = QuestionType;
    this.questionInstance = null;


    if (!containerElement) throw new Error("No container element found");
    this.containerElement = containerElement;
    this.questionElem = null;

    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
  }

  render() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = BaseQuestionFormTemplate();
    this.questionElem = wrapper.querySelector(".question");
    this.questionInstance = new this.QuestionType({
      questionData: this.questionData,
    });
    this.questionInstance.render();
  }

  mount() {
    this.questionInstance.mount(this.questionElem);
    this.questionInstance?.handleEvents?.();
    this.containerElement.appendChild(this.questionElem);
  }

  _getQuestionData() {
    return this.questionInstance.getQuestionData();
  }

  _validateQuestionData() {}

  handleEvents() {
    this.questionElem.querySelector('.question__controls').addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      switch (action) {
        case 'save':
          const draft = this._getQuestionData();
          this._validateQuestionData()
          return this.onSuccess?.(draft);
        case 'cancel':
          return this.onCancel?.();
      }
    });
  }

  draw() {
    this.render();
    this.mount();
    this.handleEvents();
  }

  destroy() {
    if (this.questionElem) {
      this.questionElem.remove();
    }
  }

}

export class TextQuestion {
  constructor({questionData = null}) {
    this.questionData = questionData ? questionData : {};
    this.questionBodyElem = null;
  }

  render() {
    this.questionBodyElem = TextQuestionFormTemplate(this.questionData);
    return this.questionBodyElem
  }

  mount(container) {
    if (!container) throw new Error("TextQuestion requires container!");
    if (!this.questionBodyElem) this.render();
    container.insertAdjacentElement("afterbegin", this.questionBodyElem);
  }

  getQuestionData() {
    const draft = {};
    const questionText = this.questionBodyElem.querySelector('[data-question-text]').value;
    const questionAnswer = this.questionBodyElem.querySelector('[data-question-answer]').value;
    draft.id = this.questionData.id ? this.questionData.id : createQuestionId();
    draft.type = "text";
    draft.text = questionText;
    draft.answer = questionAnswer.toLowerCase().trim();
    return draft;
  }
}

export class SingleChoiceQuestion {
  constructor({questionData = null}) {
    this.questionData = questionData ? questionData : {};
    this.questionBodyElem = null;
    this.options = structuredClone(this.questionData?.options) || [];
  }

  render() {
    this.questionBodyElem = SingleChoiceQuestionFormTemplate(this.questionData);
    return this.questionBodyElem;
  }

  mount(container) {
    if (!container) throw new Error("SingleChoiceQuestion requires container!");
    if (!this.questionBodyElem) this.render();
    container.insertAdjacentElement("afterbegin", this.questionBodyElem);
  }

  getQuestionData() {
    const draft = {};
    const questionText = this.questionBodyElem.querySelector('[data-question-text]').value;
    const questionAnswer = this.questionBodyElem.querySelector('input[name="answer"]:checked')?.value ?? "Ответ не выбран";
    draft.id = this.questionData.id ? this.questionData.id : createQuestionId();
    draft.type = "single_choice";
    draft.text = questionText;
    draft.answer = questionAnswer.toLowerCase().trim();
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

    input.type = "radio";
    input.value = option.value;
    input.name = "answer";
    input.id = `answer-${this.options.length}`;

    container.appendChild(label);
    container.appendChild(input);

    return container;
  }
}

export class MultipleChoiceQuestion {
  constructor({questionData = null,}) {
    this.questionData = questionData ? questionData : {};
    this.questionBodyElem = null;
    this.options = structuredClone(this.questionData?.options) || [];
  }

  render() {
    this.questionBodyElem = MultipleChoiceQuestionFormTemplate(this.questionData);
    return this.questionBodyElem;
  }

  mount(container) {
    if (!container) throw new Error("SingleChoiceQuestion requires container!");
    if (!this.questionBodyElem) this.render();
    container.insertAdjacentElement("afterbegin", this.questionBodyElem);
  }

  getQuestionData() {
    const draft = {};
    const questionText = this.questionBodyElem.querySelector('[data-question-text]').value;
    const questionAnswerElems = this.questionBodyElem.querySelectorAll('input[name="answer"]:checked');
    const questionAnswer = Array.from(questionAnswerElems).map(e => e.value.trim());
    draft.id = this.questionData.id ? this.questionData.id : createQuestionId();
    draft.type = "multiple_choice";
    draft.text = questionText;
    draft.answer = questionAnswer;
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

    input.type = "checkbox";
    input.value = option.value;
    input.name = "answer";
    input.id = `answer-${this.options.length}`;

    container.appendChild(label);
    container.appendChild(input);

    return container;
  }
}

export function QuestionRenderer(questionData) {
  const questionType = questionData.type;
  switch (questionType) {
    case "text":
      return TextQuestionTemplate(questionData);
    case "single_choice":
      return SingleChoiceQuestionTemplate(questionData);
    case "multiple_choice":
      return MultipleChoiceQuestionTemplate(questionData);
    default:
      throw new Error(`Question type "${questionType}" not supported`);
  }
}