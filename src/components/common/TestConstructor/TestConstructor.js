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

function createQuestionId() {
  return crypto.randomUUID();
}

class QuestionConstructor {
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

class TextQuestion {
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

class SingleChoiceQuestion {
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

class MultipleChoiceQuestion {
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

function QuestionRenderer(questionData) {
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
          lesson_id: this.lessonId,
          course_id: this.courseId,
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
    const questionId = event.target.closest('[data-question-id]')?.dataset?.questionId;
    if (!questionId) throw new Error(`Question ID ${questionId} not found!`);
    const questionData = this.data.questions.find(question => question.id === questionId);
    if (!questionData) throw new Error(`Question ID ${questionId} not found!`);
    switch (action) {
      case "editQuestion":
        return await this._openModal(questionData.type, questionData);
      case "deleteQuestion":
        const questions = this.data.questions.filter(question => question.id !== questionId);
        this.data = {...this.data, questions};
        this._renumberQuestions();
        this._drawQuestionList();
    }
  }

  async _openModal(questionType, questionData = null) {
    const questionTypes = {
      "text": TextQuestion,
      "single_choice": SingleChoiceQuestion,
      "multiple_choice": MultipleChoiceQuestion,
    };

    const modal = new ModalWithComponent({
      Component: QuestionConstructor,
      componentProps: {
        QuestionType: questionTypes[questionType],
        questionData: questionData,
        onSuccess: (draft) => {
          this._applyQuestionDraft(draft)
          this._drawQuestionList();
          modal.destroy();
        },
        onCancel: () => modal.destroy()
      },
      title: "Составьте вопрос"
    });
    await modal.draw();
  }

  _applyQuestionDraft(draft) {
    const prev = this.data;

    const updatedIndex = prev.questions.findIndex(q => q.id === draft.id);
    if (updatedIndex !== -1) {
      const questions = prev.questions.with(updatedIndex, draft);
      this.data = {...prev, questions};
    } else {
      const questions = [...prev.questions, draft];
      this.data = {...prev, questions};
    }

    this._renumberQuestions();
  }

  _renumberQuestions() {
    const questions = this.data.questions.map((question, index) => (
      {...question, number: index+1}
    ));
    this.data = {...this.data, questions, questions_number: questions.length};
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
