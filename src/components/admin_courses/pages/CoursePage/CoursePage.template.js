export const CoursePageTemplate = (course) => {
  const modulesCount = Array.isArray(course.modules) ? course.modules.length : 0;
  const lessonsCount = Array.isArray(course.lessons) ? course.lessons.length : 0;

  return `
      <article class="course" data-course-id="${course.id}">
      <header class="course__header">
        <div class="course__header-top">
          <a href="/admin/courses" class="btn btn-secondary course__back-link" data-spa-link>
            <i class="fa-solid fa-arrow-left"></i>
            <span>К списку курсов</span>
          </a>
        </div>
        <div class="course__hero">
          <div class="course__hero-copy">
            <span class="page-hero__eyebrow">Курс</span>
            <h1 class="course__header-title">Курс ID: ${course.id}</h1>
            <p class="course__hero-description">Редактируйте базовые сведения о курсе и сразу переходите к наполнению модулей и уроков.</p>
          </div>
          <div class="course__hero-stats">
            <div class="course__hero-stat">
              <span class="course__hero-stat-label">Модулей</span>
              <strong class="course__hero-stat-value">${modulesCount}</strong>
            </div>
            <div class="course__hero-stat">
              <span class="course__hero-stat-label">Уроков</span>
              <strong class="course__hero-stat-value">${lessonsCount}</strong>
            </div>
          </div>
        </div>
        <form class="course__general-form" id="course-general-form">
          <div class="form-group course__general-form-group">
            <label for="course-title">Название курса</label>
            <input
              type="text"
              value="${course.title}"
              id="course-title"
              name="title"
              class="course__title"
            >
          </div>
          <div class="form-group course__general-form-group">
            <label for="course-description">Описание курса</label>
            <textarea class="course__description" id="course-description" name="description">${course.description}</textarea>
          </div>
          <div class="course__general-form-controls">
            <button class="btn btn-primary" data-action="save">Сохранить</button>
            <button class="btn btn-secondary" data-action="cancel">Отменить</button>
          </div>
        </form>
      </header>
      <div class="course-modules">
        <div class="course-modules__header">
          <div>
            <span class="course-modules__eyebrow">Структура</span>
            <h2>Модули курса</h2>
          </div>
          <button class="btn btn-primary course-modules__add-btn" data-action="createModule">
            <i class="fa-solid fa-plus"></i> <span>Добавить модуль</span>
          </button>
        </div>
        <div class="course-modules__body">
          <ul class="course-modules__list">
            
          </ul>
        </div>
      </div>
    </article>
  `
};
