import {TestConstructorTemplate} from './TestConstructor.template.js';
import TestService from "../../../services/TestService";
import ModalWithComponent from "../ModalWithComponent/ModalWithComponent";
import {
  BaseQuestionFormTemplate,
  TextQuestionFormTemplate,
  TextQuestionTemplate,
  SingleChoiceQuestionFormTemplate,
  SingleChoiceQuestionTemplate, MultipleChoiceQuestionTemplate, MultipleChoiceQuestionFormTemplate,
} from "./Questions.template.js";

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
      testData[oldIndex] = newQuestionData;
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
          this._updateData();
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
    const wrapper = document.createElement("div");
    wrapper.innerHTML = TextQuestionFormTemplate(this.questionData);
    this.questionBodyElem = wrapper.querySelector(".question__body");
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
    const wrapper = document.createElement("div");
    wrapper.innerHTML = SingleChoiceQuestionFormTemplate(this.questionData);
    this.questionBodyElem = wrapper.querySelector(".question__body");
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
    const wrapper = document.createElement("div");
    wrapper.innerHTML = MultipleChoiceQuestionFormTemplate(this.questionData);
    this.questionBodyElem = wrapper.querySelector(".question__body");
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

function QuestionRenderer(questionData) {
  const wrapper = document.createElement("div");
  const questionType = questionData.type;
  switch (questionType) {
    case "text":
      wrapper.innerHTML = TextQuestionTemplate(questionData);
      return wrapper.querySelector(".test__question");
    case "single_choice":
      wrapper.innerHTML = SingleChoiceQuestionTemplate(questionData);
      return wrapper.querySelector(".test__question");
    case "multiple_choice":
      wrapper.innerHTML = MultipleChoiceQuestionTemplate(questionData);
      return wrapper.querySelector(".test__question");
  }
}

export default class TestConstructor {
  constructor({courseId, lessonId, testContainer = null}) {
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.data = {};
    this.template = "";
    this.testContainer = testContainer;
    this.questionList = null;
    this.testElem = null;
  }

  async fetchData() {
    try {
      this.data = await TestService.getById(this.lessonId);
    } catch (error) {
      const err = JSON.parse(error.message);
      if (err.status === 404) {
        this.data = {
          title: "",
          questions: [],
          questions_number: 0
        };
      }
      console.warn(err.message);
    }
  }

  render() {
    const wrapper = document.createElement("div");
    this.template = TestConstructorTemplate(this.data);
    wrapper.innerHTML = this.template;
    this.questionList = wrapper.querySelector("[data-question-list]");
    this.testElem = wrapper.querySelector("[data-test-id]");
    this.questionList = this.testElem.querySelector("[data-question-list]");
    this.testContainer = this.testContainer ? this.testContainer : document.getElementById("component");
  }

  _drawQuestionList() {
    this.questionList.innerHTML = "";
    this.data.questions.forEach((question) => {
      const questionElem = QuestionRenderer(question);
      this.questionList.appendChild(questionElem);
    });

    if (this.data.questions.length === 0) {
      this.questionList.innerHTML = `<li class="test__questions--empty">Вопросы отсутствуют</li>`;
    }
  }

  mount() {
    this.testContainer.appendChild(this.testElem);
    this._drawQuestionList();
  }

  async handleEvents() {
    const testControls = this.testElem.querySelector(".test__controls");
    testControls.addEventListener("click", async (event) => {
      this._handleTestControls(event);
      await this._handleQuestionCreate(event);
    });
    this.questionList.addEventListener("click", async (event) => {
      await this._handleQuestionControls(event);
    })
  }

  _handleTestControls(event) {
    const action = event.target.closest("[data-action]")?.dataset?.action;
    if (!action) return;
    switch (action) {
      case "cancel":
        history.back();
        const url = window.location.href;
        return window.router.navigate(url);
    }
  }

  async _handleQuestionCreate(event) {
    const questionType = event.target.closest('[data-question-type]')?.dataset?.questionType;
    if (!questionType) return;
    switch (questionType) {
      case "text":
        return this._openModal(questionType);
      case "single_choice":
        return this._openModal(questionType);
      case "multiple_choice":
        return this._openModal(questionType);
    }
  }

  async _handleQuestionControls(event) {
    const action = event.target.closest('[data-action]')?.dataset?.action;
    if (!action) return;
    const questionNumber = Number(event.target.closest('[data-question-number]').dataset.questionNumber);
    const questionData = this.data.questions.find(question => question.number === questionNumber);
    if (!questionData) throw new Error(`Question number ${questionNumber} not found!`);
    switch (action) {
      case "editQuestion":
        return await this._openModal(questionData.type, questionData);
      case "deleteQuestion":
        this.data.questions = this.data.questions.filter(question => question.number !== questionNumber);
        this._drawQuestionList();
    }
  }

  async _openModal(questionType, questionData = null) {
    const questionTypes = {
      "text": TextQuestion,
      "single_choice": SingleChoiceQuestion,
      "multiple_choice": MultipleChoiceQuestion,
    };

    const questionNumber = questionData?.number ?? this.data.questions_number + 1;

    const modal = new ModalWithComponent({
      Component: QuestionConstructor,
      componentProps: {
        getData: () => this.data,
        QuestionType: questionTypes[questionType],
        questionNumber: questionNumber,
        questionData: questionData,
        onSuccess: () => {
          this._drawQuestionList();
          modal.destroy();
        },
        onCancel: () => modal.destroy()
      },
      title: "Составьте вопрос"
    });
    await modal.draw();
  }

  async draw() {
    await this.fetchData();
    this.render();
    this.mount();
    await this.handleEvents();
  }

  destroy() {
    this.testContainer.removeChild(this.testElem);
  }
}
