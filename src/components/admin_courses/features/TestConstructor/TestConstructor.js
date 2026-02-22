import {TestConstructorTemplate} from './TestConstructor.template.js';
import TestService from "../../../../services/TestService.js";
import ModalWithComponent from "../../../common/ModalWithComponent/ModalWithComponent.js";
import { QuestionEditorForm, renderQuestionCard } from "./questions/index.js";


class TestStore {
  constructor({ data }) {
    if (!data) throw new Error("TestStore requires data!");

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
    this.syncQuestionNumbers();
  }

  updateTitle(newTitle) {
    const prev = this.data;
    this.data = {...prev, title: newTitle};
  }

  addQuestion(draft) {
    const prev = this.data;
    const questions = [...prev.questions, draft];
    this.data = {...prev, questions};
    this.syncQuestionNumbers();
  }

  updateQuestion(draft) {
    const prev = this.data;
    const updatedIndex = prev.questions.findIndex(q => q.id === draft.id);
    if (updatedIndex === -1) throw new Error(`Question id ${draft.id} not found.`);
    const questions = prev.questions.with(updatedIndex, draft);
    this.data = {...prev, questions};
    this.syncQuestionNumbers();
  }

  deleteQuestion(id) {
    const questions = this.data.questions.filter(question => question.id !== id);
    this.data = {...this.data, questions};
    this.syncQuestionNumbers();
  }

  getQuestion(id) {
    return structuredClone(this.data.questions.find(q => q.id === id));
  }

  syncQuestionNumbers() {
    const questions = this.data.questions.map((question, index) => (
      {...question, number: index+1}
    ));
    this.data = {...this.data, questions, questions_number: questions.length};
  }

  getSnapshot() {
    return structuredClone(this.data);
  }
}

class TestBuilderView {
  constructor({ testContainer = null }) {
    this.template = "";
    this.testContainer = testContainer;
    this.testElem = null;
    this.questionList = null;

    this.handleTestAction = null;
    this.handleQuestionAction = null;
    this.handleTitleInput = null;
  }

  render(state) {
    this.testContainer = this.testContainer ? this.testContainer : document.getElementById("component");
    if (this.testElem) this.testElem.remove();
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
      const questionElem = renderQuestionCard(question);
      this.questionList.appendChild(questionElem);
    });

    if (state.questions.length === 0) {
      this.questionList.innerHTML = `<li class="test__questions--empty">Вопросы отсутствуют</li>`;
    }
  }

  bindHandlers({ handleTestAction, handleQuestionAction, handleTitleInput }) {
    this.handleTestAction = handleTestAction;
    this.handleQuestionAction = handleQuestionAction;
    this.handleTitleInput = handleTitleInput;
  }

  async bindTestActions() {
    const testControls = this.testElem.querySelector(".test__controls");
    testControls.addEventListener("click", async (event) => {
      const action = event.target.closest('[data-action]')?.dataset?.action;
      const questionType = event.target.closest('[data-question-type]')?.dataset?.questionType;
      if (!action) return;
      await this.handleTestAction(action, { questionType });
    });

    const titleInput = this.testElem.querySelector("[data-title-input]");
    titleInput.addEventListener("input", (e) => this.handleTitleInput(e.target.value));
  }

  async bindQuestionActions() {
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

class TestBuilderController {
  constructor({ store, view }) {
    this.store = store;
    this.view = view;
  }

  async init() {
    this.view.bindHandlers({
      handleTestAction: this.handleTestAction.bind(this),
      handleQuestionAction: this.handleQuestionAction.bind(this),
      handleTitleInput: this.handleTitleInput.bind(this),
    });

    this.view.render(this.store.getSnapshot());

    await this.view.bindTestActions();
    await this.view.bindQuestionActions();
  }

  handleTitleInput(newTitle) {
    this.store.updateTitle(newTitle);
  }

  async handleTestAction(action, payload = {}) {
    if (action === "save") this.saveTest();
    if (action === "cancel") history.back();
    if (action === "createQuestion") {
      await this.openCreateQuestionModal(payload.questionType);
    }
  }

  async handleQuestionAction(action, questionId) {
    if (action === "deleteQuestion") {
      this.store.deleteQuestion(questionId);
      this.view.drawQuestionList(this.store.getSnapshot());
    }
    if (action === "editQuestion") await this.openEditQuestionModal(questionId);
  }

  async openEditQuestionModal(questionId) {
    const question = this.store.getQuestion(questionId);
    if (!question) throw new Error(`Question id ${questionId} not found.`);
    await this.openQuestionEditorModal({ questionType: question.type, questionData: question });
  }

  async openCreateQuestionModal(questionType) {
    await this.openQuestionEditorModal({ questionType: questionType, questionData: null });
  }

  async openQuestionEditorModal({ questionType, questionData = null }) {
    const modal = new ModalWithComponent({
      Component: QuestionEditorForm,
      componentProps: {
        questionType,
        questionData,
        onSuccess: (draft) => {
          this.upsertQuestionDraft(draft);
          this.view.drawQuestionList(this.store.getSnapshot());
          modal.destroy();
        },
        onCancel: () => modal.destroy()
      },
      title: "Составьте вопрос"
    });
    await modal.draw();
  }

  upsertQuestionDraft(draft) {
    const exists = this.store.getQuestion(draft.id);

    if (exists) return this.store.updateQuestion(draft);
    this.store.addQuestion(draft);
  }

  saveTest() {
    console.log(this.store.getSnapshot());
  }
}

export default class TestConstructor {
  constructor({ courseId, lessonId, testContainer = null }) {
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.testContainer = testContainer;

    this.data = null;
    this.store = null;
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

  setupLayers() {
    this.store = new TestStore({ data: this.data });
    this.view = new TestBuilderView({ testContainer: this.testContainer });
    this.controller = new TestBuilderController({ store: this.store, view: this.view });
  }

  async mount() {
    await this.controller.init();
  }

  async draw() {
    await this.fetchData();
    this.setupLayers();
    await this.mount();
  }

  destroy() {
    this.view?.destroy();
  }
}
