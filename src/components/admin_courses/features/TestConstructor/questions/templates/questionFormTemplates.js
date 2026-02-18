export function renderQuestionFormShell() {
  return `
    <form class="question" data-question-form>
      <div class="question__controls">
          <button class="btn btn-secondary" data-action="cancel" type="button">Отменить</button>
          <button class="btn btn-primary" data-action="save" type="submit">Сохранить</button>
      </div>
    </form>
  `;
}

export function createTextQuestionBody(questionData) {
  const questionText = questionData?.text ?? "";
  const questionAnswer = questionData?.answer ?? "";

  const questionConditionElement = createQuestionConditionInput(questionText);

  const questionAnswerElement = document.createElement("input");
  questionAnswerElement.id = "question-answer";
  questionAnswerElement.type = "text";
  questionAnswerElement.name = "answer";
  questionAnswerElement.value = questionAnswer;
  questionAnswerElement.classList.add("form-input");
  questionAnswerElement.dataset.questionAnswer = "";

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

  wrapper.querySelector(".question__text").appendChild(questionConditionElement);
  wrapper.querySelector(".question__answer").appendChild(questionAnswerElement);

  return wrapper.querySelector(".question__body");
}

export function createSingleChoiceQuestionBody(questionData) {
  return createChoiceQuestionBody(questionData, { inputType: "radio" });
}

export function createMultipleChoiceQuestionBody(questionData) {
  return createChoiceQuestionBody(questionData, { inputType: "checkbox" });
}

function createQuestionConditionInput(questionText) {
  const questionConditionElement = document.createElement("input");
  questionConditionElement.id = "question-condition";
  questionConditionElement.name = "text";
  questionConditionElement.type = "text";
  questionConditionElement.value = questionText;
  questionConditionElement.classList.add("form-input");
  questionConditionElement.dataset.questionText = "";
  return questionConditionElement;
}

function isOptionSelected(optionValue, questionAnswer) {
  const option = String(optionValue).trim();
  if (Array.isArray(questionAnswer)) {
    return questionAnswer.includes(option);
  }

  return option === String(questionAnswer ?? "").trim();
}

function createOptionElementsFragment(questionData, inputType) {
  if (inputType !== "checkbox" && inputType !== "radio") {
    throw new Error("inputType must be checkbox or radio");
  }

  const optionElements = (questionData?.options ?? []).map((option, index) => {
    const isCorrect = isOptionSelected(option.value, questionData.answer);
    const optionElement = document.createElement("li");
    optionElement.classList.add("question__option");

    const optionLabelElement = document.createElement("label");
    optionLabelElement.htmlFor = `answer-${index}`;
    optionLabelElement.textContent = option.text;

    const optionInputElement = document.createElement("input");
    optionInputElement.type = inputType;
    optionInputElement.value = option.value;
    optionInputElement.checked = isCorrect;
    optionInputElement.name = "answer";
    optionInputElement.id = `answer-${index}`;

    optionElement.appendChild(optionLabelElement);
    optionElement.appendChild(optionInputElement);

    return optionElement;
  });

  const optionsFragment = document.createDocumentFragment();
  optionElements.forEach((optionElement) => optionsFragment.appendChild(optionElement));

  return optionsFragment;
}

function renderChoiceQuestionTemplate() {
  return `
    <div class="question__body">
       <div class="question__text">
        <label class="form-label" for="question-condition">Введите вопрос:</label>
      </div>
      <div class="question__answer">
        <ul class="question__answer-options" data-options-list></ul>
        <div data-options-error></div>
        <div class="question__add-option">
            <input class="form-input" type="text" name="optionInp" placeholder="Введите вариант" data-option-input>
            <button class="btn btn-primary" data-action="addOption" type="button">Добавить вариант</button>
        </div>
      </div>
    </div>
  `;
}

function createChoiceQuestionBody(questionData, { inputType }) {
  if (inputType !== "checkbox" && inputType !== "radio") {
    throw new Error("inputType must be checkbox or radio");
  }

  const questionText = questionData?.text ?? "";

  const questionConditionElement = createQuestionConditionInput(questionText);
  const optionElements = createOptionElementsFragment(questionData, inputType);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderChoiceQuestionTemplate();

  wrapper.querySelector(".question__text").appendChild(questionConditionElement);
  wrapper.querySelector(".question__answer-options").appendChild(optionElements);

  return wrapper.querySelector(".question__body");
}
