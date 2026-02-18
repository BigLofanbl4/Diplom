export const ModuleItemTemplate = (module) => {
  return `
    <li class="course-module" data-module-id="${module.id}" data-lessons-hidden="true">
      <div class="course-module__header" data-action="openModule">
        <h4 class="course-module__title">
          <span class="course-module__number">Модуль ${module.module_number}:</span>
          <span class="course-module__name">${module.title}</span>
        </h4>
        <div class="course-module__actions">
          <button class="btn btn-secondary course-module__edit-btn course-module__action-btn" data-action="updateModule">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-danger course-module__delete-btn course-module__action-btn" data-action="deleteModule">
            <i class="fa-solid fa-trash"></i>
          </button>
          <button class="course-module__toggle" data-action="openModule">
            <i class="fa-solid fa-caret-down"></i>
          </button>
        </div>
      </div>
      <div class="course-lessons">
        <ul class="course-lessons__list" data-module-lessons></ul>
        <div class="course-lessons__controls">
          <button class="btn btn-primary course-lessons__add-btn" data-action="createLesson">
            Создать урок
          </button>
        </div>
      </div>
    </li>
  `;
};