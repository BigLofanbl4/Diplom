export const TestConstructorTemplate = (test, { backHref = "/admin/courses" } = {}) => {
  return `
    <article class="test" data-test-id="${test?.lesson_id}">
      <header class="test__header">
        <div class="test__header-top">
          <a href="${backHref}" class="btn btn-secondary test__back-link" data-spa-link>
            <i class="fa-solid fa-arrow-left"></i>
            <span>К курсу</span>
          </a>
        </div>
        <div class="test__hero">
          <div class="test__hero-copy">
            <span class="page-hero__eyebrow">Тест</span>
            <h1 class="test__heading">Конструктор теста</h1>
            <p class="test__subtitle">Соберите структуру вопросов, отредактируйте формулировки и сохраните итоговый вариант для урока.</p>
          </div>
        </div>
        <input class="test__title" type="text" placeholder="Введите название теста" value="${test?.title || ""}" data-title-input>
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
                    <span>Добавить вопрос</span>
                </button>
              </div>
          </div>
      </div>
    </article>
  `
}
