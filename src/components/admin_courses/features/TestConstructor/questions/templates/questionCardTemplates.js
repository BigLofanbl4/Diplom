export function renderTextQuestionCard(questionData) {
  return renderQuestionCard(questionData, { questionType: "text" });
}

export function renderSingleChoiceQuestionCard(questionData) {
  return renderQuestionCard(questionData, { questionType: "single_choice" });
}

export function renderMultipleChoiceQuestionCard(questionData) {
  return renderQuestionCard(questionData, { questionType: "multiple_choice" });
}

function renderQuestionCard(questionData, { questionType }) {
  const questionTypeLabels = {
    text: "Текстовый ответ",
    single_choice: "Один вариант",
    multiple_choice: "Несколько вариантов",
  };

  if (!(questionType in questionTypeLabels)) {
    throw new Error("Unsupported question type for card rendering");
  }

  const questionText = String(questionData.text ?? "");
  const questionAnswer = Array.isArray(questionData.answer)
    ? questionData.answer.join(", ")
    : String(questionData.answer ?? "");

  const questionCardElement = document.createElement("li");
  questionCardElement.classList.add("test__question");
  questionCardElement.dataset.questionTypeLabel = questionTypeLabels[questionType];
  questionCardElement.dataset.questionNumber = String(Number(questionData.number) || 0);
  questionCardElement.dataset.questionId = String(questionData.uiId);

  questionCardElement.innerHTML = `
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

  const questionTextElement = document.createElement("span");
  questionTextElement.textContent = `Вопрос ${questionData.number}: ${questionText}`;

  const questionAnswerElement = document.createElement("span");
  questionAnswerElement.textContent = `Ответ: ${questionAnswer}`;

  questionCardElement.querySelector(".test__question-text").appendChild(questionTextElement);
  questionCardElement.querySelector(".test__question-answer").appendChild(questionAnswerElement);

  return questionCardElement;
}
