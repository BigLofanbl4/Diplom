<article class="course">
  <header class="course__header">
    <h1 class="course__header-title">Курс ID: 1</h1>
    <form class="course__general-form" id="course-general-form">
      <div class="form-group course__general-form-group">
        <label for="course-title">Изменить название:</label>
        <input
          type="text"
          value="Курс Frontend-разработка"
          id="course-title"
          name="title"
          class="course__title"
        >
      </div>
      <div class="form-group course__general-form-group">
        <label for="course-description">Изменить описание:</label>
        <textarea class="course__description" id="course-description" name="description">Курс по HTML, CSS, JS, Vue.js</textarea>
      </div>
      <div class="course__general-form-controls">
        <button class="btn btn-primary" data-action="save">Сохранить</button>
        <button class="btn btn-secondary" data-action="cancel">Отменить</button>
      </div>
    </form>
  </header>
  <div class="course-modules">
    <div class="course-modules__header">
      <h2>Модули</h2>
      <button class="btn btn-primary course-modules__add-btn" id="module-create-btn" data-action="create" data-entity="module">
        <i class="fa-solid fa-plus"></i>
      </button>
    </div>
    <div class="course-modules__body">
      <ul class="course-modules__list">
        
      </ul>
    </div>
  </div>
</article>
