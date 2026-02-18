import TestService from "../../../services/TestService.js";
import ModalWithComponent from "../ModalWithComponent/ModalWithComponent.js";

export const TestConstructorTemplate = (test) => {
  const questionsHTML = test?.questions?.length > 0 ? "какие то вопросы" : null;
  return `
    <article class="test" data-test-id="${test?.lesson_id}">
      <header class="test__header">
          <input class="test__title" type="text" placeholder="Введите название теста" value="${test?.title || ""}">
      </header>
      <div class="test__body">
          <ul class="test__questions" data-question-list></ul>
          <div class="test__controls">
              <button class="btn btn-secondary test__cancel-btn" data-action="cancel">Отмена</button>
              <button class="btn btn-primary test__save-btn" data-action="save">Сохранить тест</button>
              <div class="test__add-questions">
                <ul class="test__question-types" data-hidden="true">
                  <li class="test__question-type">
                      <button class="btn" data-action="createQuestion" data-question-type="text">
                          <span><i class="fa-solid fa-a"></i></span> <span>Текстовый ответ</span> 
                      </button>
                  </li>
                  <li class="test__question-type">
                      <button class="btn" data-action="createQuestion" data-question-type="single_choice">
                          <span><i class="fa-regular fa-circle-dot"></i></span> <span>Один вариант</span> 
                      </button>
                  </li>
                  <li class="test__question-type">
                      <button class="btn" data-action="createQuestion" data-question-type="multiple_choice">
                          <span><i class="fa-regular fa-square-check"></i></span> <span>Несколько вариантов</span>
                      </button>
                  </li>
                </ul>
                <button class="btn btn-primary test__add-btn">
                    <i class="fa-solid fa-plus"></i>
                </button>
              </div>
          </div>
      </div>
    </article>
  `
}
