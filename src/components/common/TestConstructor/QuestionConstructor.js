import {
  MultipleChoiceQuestionTemplate,
  SingleChoiceQuestionTemplate,
  TextQuestionTemplate
} from "./Questions.template.js";
import TestService from "../../../services/TestService.js";
import {TestConstructorTemplate} from "./TestConstructor.template.js";
import ModalWithComponent from "../ModalWithComponent/ModalWithComponent.js";

class QuestionConstructor {
  constructor({
                getData,
                QuestionType,
                questionData = null,
                questionNumber = null,
                containerElement,
                onSuccess = null,
                onCancel = null
              }) {
    this.getData = getData;
    this.questionData = questionData;
    this.mode = questionData ? "update" : "create";
    this.questionNumber = questionNumber;
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
      questionNumber: this.questionNumber
    });
    this.questionInstance.render();
  }

  mount() {
    this.questionInstance.mount(this.questionElem);
    this.questionInstance?.handleEvents?.();
    this.containerElement.appendChild(this.questionElem);
  }

  _updateData() {
    const testData = this.getData();
    const newQuestionData = this.questionInstance.getQuestionData();
    if (this.mode === "create") {
      testData.questions.push(newQuestionData);
      testData.questions_number = testData.questions.length;
    } else if (this.mode === "update") {
      const oldIndex = testData.questions.findIndex(q => q.number === newQuestionData.number);
      testData.questions[oldIndex] = newQuestionData;
    }
  }

  handleEvents() {
    this.questionElem.querySelector('.question__controls').addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]').dataset.action;
      if (!action) return;
      switch (action) {
        case 'save':
          this._updateData();
          return this.onSuccess?.();
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

class TextQuestion {
  constructor({questionData = null, questionNumber}) {
    this.questionData = questionData ? questionData : {};
    this.questionNumber = questionNumber;
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
    const questionText = this.questionBodyElem.querySelector('[data-question-text]').value;
    const questionAnswer = this.questionBodyElem.querySelector('[data-question-answer]').value;
    this.questionData.type = "text";
    this.questionData.text = questionText;
    this.questionData.answer = questionAnswer.toLowerCase().trim();
    this.questionData.number = Number(this.questionNumber);
    return this.questionData;
  }
}

class SingleChoiceQuestion {
  constructor({questionData = null, questionNumber}) {
    this.questionData = questionData ? questionData : {};
    this.questionNumber = questionNumber;
    this.questionBodyElem = null;
    this.options = this.questionData?.options || [];
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
    const questionText = this.questionBodyElem.querySelector('[data-question-text]').value;
    const questionAnswer = this.questionBodyElem.querySelector('input[name="answer"]:checked').value;
    this.questionData.type = "single_choice";
    this.questionData.text = questionText;
    this.questionData.answer = questionAnswer.toLowerCase().trim();
    this.questionData.number = Number(this.questionNumber);
    this.questionData.options = this.options;
    return this.questionData;
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
    input.type = "radio";
    input.value = option.value;
    input.name = "answer";
    input.id = `answer${this.options.length}`;

    container.appendChild(label);
    container.appendChild(input);

    return container;
  }
}

class MultipleChoiceQuestion {
  constructor({questionData = null, questionNumber}) {
    this.questionData = questionData ? questionData : {};
    this.questionNumber = questionNumber;
    this.questionBodyElem = null;
    this.options = this.questionData?.options || [];
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
    const questionText = this.questionBodyElem.querySelector('[data-question-text]').value;
    const questionAnswerElems = this.questionBodyElem.querySelectorAll('input[name="answer"]:checked');
    const questionAnswer = Array.from(questionAnswerElems).map(e => e.value.trim());
    this.questionData.type = "multiple_choice";
    this.questionData.text = questionText;
    this.questionData.answer = questionAnswer;
    this.questionData.number = Number(this.questionNumber);
    this.questionData.options = this.options;
    return this.questionData;
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
    input.type = "checkbox";
    input.value = option.value;
    input.name = "answer";
    input.id = `answer${this.options.length}`;

    container.appendChild(label);
    container.appendChild(input);

    return container;
  }
}