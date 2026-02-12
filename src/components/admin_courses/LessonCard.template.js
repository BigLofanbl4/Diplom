export const LessonCardTemplate = (lesson) => {
  return `
    <li class="course-lesson" data-lesson-id="${lesson.id}">
      <h5 class="course-lesson__title">
        <span class="course-lesson__number">Урок ${lesson.lesson_number}:</span>
        <span class="course-lesson__name">${lesson.title}</span>
      </h5>
      <p class="course-lesson__desc">${lesson.description}</p>
      <div class="course-lesson__badges">
        <span class="course-lesson__badge course-lesson__badge--danger">
          <i class="fa-regular fa-rectangle-list"></i>
          Отсутствуют тесты
        </span>
        <span class="course-lesson__badge course-lesson__badge--danger">
          <i class="fa-regular fa-file-lines"></i>
          Отсутствуют материалы
        </span>
      </div>
      <div class="course-lesson__actions">
        <a href="/admin/courses/${lesson.course_id}/test/${lesson.id}" class="btn btn-secondary course-lesson__action-btn">
            <i class="fa-regular fa-rectangle-list"></i>
        </a>
        <button class="btn btn-secondary course-lesson__edit-btn course-lesson__action-btn" data-action="updateLesson">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-danger course-lesson__delete-btn course-lesson__action-btn" data-action="deleteLesson">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </li>
  `
};