import {TestConstructorTemplate} from './TestConstructor.template.js';
import TestService from "../../../services/TestService";
import ModalWithComponent from "../ModalWithComponent/ModalWithComponent";
import { QuestionConstructor, TextQuestion, SingleChoiceQuestion, MultipleChoiceQuestion, QuestionRenderer} from "./QuestionsAPI";


class TestState {
  constructor({ data }) {
    if (!data) throw new Error("TestState requires data!");

    const hasCourseId = data.course_id !== undefined && data.course_id !== null;
    const hasLessonId = data.lesson_id !== undefined && data.lesson_id !== null;

    if (!hasCourseId || !hasLessonId) {
      throw new Error("course_id and lesson_id are required!");
    }

    this.data = {
      ...data,
      title: data.title ? data.title : "",
      questions: Array.isArray(data.questions) ? data.questions : [],
    };
    this.renumberQuestions();
  }

  addQuestion(draft) {
    const prev = this.data;
    const questions = [...prev.questions, draft];
    this.data = {...prev, questions};
    this.renumberQuestions();
  }

  updateQuestion(draft) {
    const prev = this.data;
    const updatedIndex = prev.questions.findIndex(q => q.id === draft.id);
    if (updatedIndex === -1) throw new Error(`Question id ${draft.id} not found.`);
    const questions = prev.questions.with(updatedIndex, draft);
    this.data = {...prev, questions};
    this.renumberQuestions();
  }

  deleteQuestion(id) {
    const questions = this.data.questions.filter(question => question.id !== id);
    this.data = {...this.data, questions};
    this.renumberQuestions();
  }

  getQuestion(id) {
    return structuredClone(this.data.questions.find(q => q.id === id));
  }

  renumberQuestions() {
    const questions = this.data.questions.map((question, index) => (
      {...question, number: index+1}
    ));
    this.data = {...this.data, questions, questions_number: questions.length};
  }

  getState() {
    return structuredClone(this.data);
  }
}

class TestView {
  constructor({ testContainer = null }) {
    this.template = "";
    this.testContainer = testContainer;
    this.testElem = null;
    this.questionList = null;

    this.handleTestAction = null;
    this.handleQuestionAction = null;
  }

  render(state) {
    this.testContainer = this.testContainer ? this.testContainer : document.getElementById("component");
    this.testContainer.innerHTML = "";
    const wrapper = document.createElement("div");
    this.template = TestConstructorTemplate(state);
    wrapper.innerHTML = this.template;
    this.testElem = wrapper.querySelector("[data-test-id]");
    this.questionList = this.testElem.querySelector("[data-question-list]");
    this.testContainer.appendChild(this.testElem);
    this.drawQuestionList(state);
  }

  drawQuestionList(state) {
    this.questionList.innerHTML = "";
    state.questions.forEach((question) => {
      const questionElem = QuestionRenderer(question);
      this.questionList.appendChild(questionElem);
    });

    if (state.questions.length === 0) {
      this.questionList.innerHTML = `<li class="test__questions--empty">Вопросы отсутствуют</li>`;
    }
  }

  bindHandlers({ handleTestAction, handleQuestionAction }) {
    this.handleTestAction = handleTestAction;
    this.handleQuestionAction = handleQuestionAction;
  }

  async bindTestAction() {
    const testControls = this.testElem.querySelector(".test__controls");
    testControls.addEventListener("click", async (event) => {
      const action = event.target.closest('[data-action]')?.dataset?.action;
      const questionType = event.target.closest('[data-question-type]')?.dataset?.questionType;
      if (!action) return;
      await this.handleTestAction(action, { questionType });
    });
  }

  async bindQuestionAction() {
    this.questionList.addEventListener("click", async (event) => {
      const action = event.target.closest('[data-action]')?.dataset?.action;
      if (!action) return;
      const questionId = event.target.closest('[data-question-id]')?.dataset?.questionId;
      if (!questionId) return;
      await this.handleQuestionAction(action, questionId);
    })
  }

  destroy() {
    if (this.testElem) this.testElem.remove();
  }
}

class TestController {
  constructor({ state, view }) {
    this.state = state;
    this.view = view;
  }

  async init() {
    this.view.bindHandlers({
      handleTestAction: this.handleTestAction.bind(this),
      handleQuestionAction: this.handleQuestionAction.bind(this),
    });

    this.view.render(this.state.getState());

    await this.view.bindTestAction();
    await this.view.bindQuestionAction();
  }

  async handleTestAction(action, payload = {}) {
    if (action === "save") this.saveTest();
    if (action === "cancel") history.back();
    if (action === "createQuestion") {
      await this.createQuestion(payload.questionType);
    }
  }

  async handleQuestionAction(action, questionId) {
    if (action === "deleteQuestion") {
      this.state.deleteQuestion(questionId);
      this.view.drawQuestionList(this.state.getState());
    }
    if (action === "editQuestion") await this.editQuestionById(questionId);
  }

  async editQuestionById(questionId) {
    const question = this.state.getQuestion(questionId);
    if (!question) throw new Error(`Question id ${questionId} not found.`);
    await this.openQuestionEditor({ questionType: question.type, questionData: question });
  }

  async createQuestion(questionType) {
    await this.openQuestionEditor({ questionType: questionType, questionData: null });
  }

  async openQuestionEditor({ questionType, questionData = null }) {
    const modal = new ModalWithComponent({
      Component: QuestionConstructor,
      componentProps: {
        questionType,
        questionData,
        onSuccess: (draft) => {
          this.applyQuestionDraft(draft);
          this.view.drawQuestionList(this.state.getState());
          modal.destroy();
        },
        onCancel: () => modal.destroy()
      },
      title: "Составьте вопрос"
    });
    await modal.draw();
  }

  applyQuestionDraft(draft) {
    const exists = this.state.getQuestion(draft.id);

    if (exists) return this.state.updateQuestion(draft);
    this.state.addQuestion(draft);
  }

  saveTest() {
    // NOT IMPLEMENTED YET
  }
}

export default class TestConstructor {
  constructor({ courseId, lessonId, testContainer = null }) {
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.testContainer = testContainer;

    this.data = null;
    this.state = null;
    this.view = null;
    this.controller = null;
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
    this.state = new TestState({ data: this.data });
    this.view = new TestView({ testContainer: this.testContainer });
    this.controller = new TestController({ state: this.state, view: this.view });
  }

  async mount() {
    await this.controller.init();
  }

  async draw() {
    await this.fetchData();
    this.render();
    await this.mount();
  }

  destroy() {
    this.view?.destroy();
  }
}
