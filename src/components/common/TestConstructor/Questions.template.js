export function BaseQuestionFormTemplate() {
  return `
    <div class="question">
      <div class="question__controls">
          <button class="btn btn-secondary" data-action="cancel">Отменить</button>
          <button class="btn btn-primary" data-action="save">Сохранить</button>
      </div>
    </div>
  `
}

export function TextQuestionFormTemplate(questionData) {
  const questionText = questionData?.text ?? "";
  const questionAnswer = questionData?.answer ?? "";

  const questionConditionElem = getQuestionConditionElem(questionText);

  const questionAnswerElem = document.createElement("input");
  questionAnswerElem.id = "question-answer";
  questionAnswerElem.type = "text";
  questionAnswerElem.value = questionAnswer;
  questionAnswerElem.classList.add("form-input");
  questionAnswerElem.dataset.questionAnswer = '';


  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="question__body">
      <div class="question__text">
        <label class="form-label" for="question-condition">Введите вопрос:</label>
      </div>
      <div class="question__answer">
          <label class="form-label" for="question-answer">Введите ответ: </label>
      </div>
    </div>  
    `;
  wrapper.querySelector(".question__text").appendChild(questionConditionElem);
  wrapper.querySelector(".question__answer").appendChild(questionAnswerElem);

  return wrapper.querySelector(".question__body");
}

export function SingleChoiceQuestionFormTemplate(questionData) {
  return ChoiceQuestionFormTemplate(questionData, {type: "radio"});
}

export function MultipleChoiceQuestionFormTemplate(questionData) {
  return ChoiceQuestionFormTemplate(questionData, {type: "checkbox"});
}

export function TextQuestionTemplate(questionData) {
  return QuestionCardTemplate(questionData, {questionType: "text"});
}

export function SingleChoiceQuestionTemplate(questionData) {
  return QuestionCardTemplate(questionData, {questionType: "single_choice"});
}

export function MultipleChoiceQuestionTemplate(questionData) {
  return QuestionCardTemplate(questionData, {questionType: "multiple_choice"});
}

function getQuestionConditionElem(questionText) {
  const questionConditionElem = document.createElement("input");
  questionConditionElem.id = "question-condition";
  questionConditionElem.type = "text";
  questionConditionElem.value = questionText;
  questionConditionElem.classList.add("form-input");
  questionConditionElem.dataset.questionText = '';
  return questionConditionElem;
}

function getQuestionOptionElemsFragment(questionData, type) {
  if (type !== "checkbox" && type !== "radio") {
    throw new Error("type - must be a checkbox or radio")
  }

  const questionOptionElems = (questionData?.options ?? []).map((option, index) => {
    const isCorrect = option.value === questionData.answer;
    const questionOptionElem = document.createElement("li");
    questionOptionElem.classList.add("question__option");

    const optionLabelElem = document.createElement("label");
    optionLabelElem.setAttribute("for", `answer-${index}`);
    optionLabelElem.textContent = option.text;

    const optionInputElem = document.createElement("input");
    optionInputElem.type = type;
    optionInputElem.value = option.value;
    optionInputElem.checked = isCorrect;
    optionInputElem.name = "answer";
    optionInputElem.id = `answer-${index}`;

    questionOptionElem.appendChild(optionLabelElem);
    questionOptionElem.appendChild(optionInputElem);

    return questionOptionElem;
  });

  const questionOptionsFragment = document.createDocumentFragment();
  questionOptionElems.forEach(optionElem => questionOptionsFragment.appendChild(optionElem));

  return questionOptionsFragment;
}

function getChoiceQuestionTemplate() {
  return `
    <div class="question__body">
       <div class="question__text">
        <label class="form-label" for="question-condition">Введите вопрос:</label>
      </div>
      <div class="question__answer">
        <ul class="question__answer-options"></ul>
        <div class="question__add-option">
            <input class="form-input" type="text" placeholder="Введите вариант" data-option-input>
            <button class="btn btn-primary" data-action="addOption">Добавить вариант</button>
        </div>
      </div>
    </div>
  `
}

function ChoiceQuestionFormTemplate(questionData, {type}) {
  if (type !== "checkbox" && type !== "radio") {
    throw new Error("type - must be a checkbox or radio");
  }

  const questionText = questionData?.text ?? "";

  const questionConditionElem = getQuestionConditionElem(questionText);
  const questionOptionsFragment = getQuestionOptionElemsFragment(questionData, type);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = getChoiceQuestionTemplate();

  wrapper.querySelector('.question__text').appendChild(questionConditionElem);
  wrapper.querySelector('.question__answer-options').appendChild(questionOptionsFragment);

  return wrapper.querySelector('.question__body');
}

function QuestionCardTemplate(questionData, {questionType}) {
  const questionTypeLabels = {
    "text": "Текстовый ответ",
    "single_choice": "Один вариант",
    "multiple_choice": "Несколько вариантов"
  };

  if (!(questionType in questionTypeLabels)) {
    throw new Error("Question types must be one of the following question types: text, single_choice, multiple_choice");
  }

  const questionText = String(questionData.text ?? "");
  const questionAnswer = Array.isArray(questionData.answer)
    ? questionData.answer.join(", ")
    : String(questionData.answer ?? "")

  const testQuestionElem = document.createElement("li");
  testQuestionElem.classList.add("test__question");
  testQuestionElem.dataset.questionType = questionType;
  testQuestionElem.dataset.questionTypeLabel = questionTypeLabels[questionType];
  testQuestionElem.dataset.questionNumber = String(Number(questionData.number) || 0);

  testQuestionElem.innerHTML = `
    <div class="test__question-body">
      <h5 class="test__question-text"></h5>
      <p class="test__question-answer"></p>
    </div>
    <div class="test__question-controls">
      <button class="btn btn-secondary test__question-edit" data-action="editQuestion">
          <i class="fa-solid fa-pen"></i>
      </button>
      <button class="btn btn-danger test__question-delete" data-action="deleteQuestion">
          <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;

  const questionTextElem = document.createElement("span");
  questionTextElem.textContent = `Вопрос ${questionData.number}: ${questionText}`;

  const questionAnswerElem = document.createElement("span");
  questionAnswerElem.textContent = `Ответ: ${questionAnswer}`;

  testQuestionElem.querySelector('.test__question-text').appendChild(questionTextElem);
  testQuestionElem.querySelector('.test__question-answer').appendChild(questionAnswerElem);

  return testQuestionElem;
}