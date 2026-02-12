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
  return `
    <div class="question__body">
      <div class="question__text">
        <label class="form-label" for="question-condition">Введите вопрос:</label>
        <input class="form-input" type="text" id="question-condition" value="${questionText}" data-question-text>
      </div>
      <div class="question__answer">
          <label class="form-label" for="question-answer">Введите ответ: </label>
          <input class="form-input" type="text" id="question-answer" value="${questionAnswer}" data-question-answer>
      </div>
    </div>   
  `;
}

export function SingleChoiceQuestionFormTemplate(questionData) {
  const questionText = questionData?.text ?? "";
  const questionOptionsHTML = questionData?.options?.map((option, index) => {
    const isCorrect = option.value === questionData.answer;
    return `
      <li class="question__option">
        <label for="answer${index}">${option.text}</label>
        <input type="radio" name="answer" value="${option.value}" ${isCorrect ? "checked" : ""}>
      </li>
    `
  }).join("");
  return `
    <div class="question__body">
       <div class="question__text">
        <label class="form-label" for="question-condition">Введите вопрос:</label>
        <input class="form-input" type="text" id="question-condition" value="${questionText}" data-question-text>
      </div>
      <div class="question__answer">
        <ul class="question__answer-options">
            ${questionOptionsHTML ? questionOptionsHTML : ""}
        </ul>
        <div class="question__add-option">
            <input class="form-input" type="text" placeholder="Введите вариант" data-option-input>
            <button class="btn btn-primary" data-action="addOption">Добавить вариант</button>
        </div>
      </div>
    </div>
  `
}

export function MultipleChoiceQuestionFormTemplate(questionData) {
  const questionText = questionData?.text ?? "";
  const questionOptionsHTML = questionData?.options?.map((option, index) => {
    const isCorrect = questionData.answer.includes(option.value);
    return `
      <li class="question__option">
        <label for="answer${index}">${option.text}</label>
        <input type="checkbox" name="answer" value="${option.value}" ${isCorrect ? "checked" : ""}>
      </li>
    `
  }).join("");
  return `
    <div class="question__body">
       <div class="question__text">
        <label class="form-label" for="question-condition">Введите вопрос:</label>
        <input class="form-input" type="text" id="question-condition" value="${questionText}" data-question-text>
      </div>
      <div class="question__answer">
        <ul class="question__answer-options">
            ${questionOptionsHTML ? questionOptionsHTML : ""}
        </ul>
        <div class="question__add-option">
            <input class="form-input" type="text" placeholder="Введите вариант" data-option-input>
            <button class="btn btn-primary" data-action="addOption">Добавить вариант</button>
        </div>
      </div>
    </div>
  `
}


export function TextQuestionTemplate(questionData) {
  const questionText = questionData.text;
  const questionAnswer = questionData.answer;
  return `
    <li class="test__question" data-question-number="${questionData.number}" data-question-type="text" data-question-type-label="Текстовый ответ">
      <div class="test__question-body">
        <h5 class="test__question-text">
            <span>Вопрос ${questionData.number}:</span> <span>${questionText}</span>
        </h5>
        <p class="test__question-answer">
          <span>Ответ:</span> <span>${questionAnswer}</span>
        </p>
      </div>
      <div class="test__question-controls">
        <button class="btn btn-secondary test__question-edit" data-action="editQuestion">
            <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-danger test__question-delete" data-action="deleteQuestion">
            <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </li>
  `;
}

export function SingleChoiceQuestionTemplate(questionData) {
  const questionText = questionData.text;
  const questionAnswer = questionData.answer;
  return `
    <li class="test__question" data-question-number="${questionData.number}" data-question-type="single_choice" data-question-type-label="Один вариант">
      <div class="test__question-body">
        <h5 class="test__question-text">
            <span>Вопрос ${questionData.number}:</span> <span>${questionText}</span>
        </h5>
        <p class="test__question-answer">
          <span>Ответ:</span> <span>${questionAnswer}</span>
        </p>
      </div>
      <div class="test__question-controls">
        <button class="btn btn-secondary test__question-edit" data-action="editQuestion">
            <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-danger test__question-delete" data-action="deleteQuestion">
            <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </li>
  `;
}

export function MultipleChoiceQuestionTemplate(questionData) {
  const questionText = questionData.text;
  const questionAnswer = questionData.answer.join(",");
  return `
    <li class="test__question" data-question-number="${questionData.number}" data-question-type="multiple_choice" data-question-type-label="Несколько вариантов">
      <div class="test__question-body">
        <h5 class="test__question-text">
            <span>Вопрос ${questionData.number}:</span> <span>${questionText}</span>
        </h5>
        <p class="test__question-answer">
          <span>Ответ:</span> <span>${questionAnswer}</span>
        </p>
      </div>
      <div class="test__question-controls">
        <button class="btn btn-secondary test__question-edit" data-action="editQuestion">
            <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-danger test__question-delete" data-action="deleteQuestion">
            <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </li>
  `;
}
