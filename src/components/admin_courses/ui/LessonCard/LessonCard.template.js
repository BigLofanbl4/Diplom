export const LessonCardTemplate = (lesson) => {
  const hasMaterials = Array.isArray(lesson.materials) && lesson.materials.length > 0;
  return `
    <li class="course-lesson" data-lesson-id="${lesson.id}">
      <h5 class="course-lesson__title">
        <span class="course-lesson__number">Урок ${lesson.lesson_number}:</span>
        <span class="course-lesson__name">${lesson.title}</span>
      </h5>
      <p class="course-lesson__desc">${lesson.description}</p>
      <div class="course-lesson__badges">
        <span class="course-lesson__badge ${!lesson.test_id ? "course-lesson__badge--danger" : ""}">
          <i class="fa-regular fa-rectangle-list"></i>
          ${!lesson.test_id ? "Отсутвует тест" : "Тест прикреплен"}
        </span>
        <span class="course-lesson__badge ${!hasMaterials ? "course-lesson__badge--danger" : ""}">
          <i class="fa-regular fa-file-lines"></i>
          ${!hasMaterials ? "Отсутствуют материалы" : `Материалы прикреплены (${lesson.materials.length})`}
        </span>
      </div>
      <div class="course-lesson__actions">
        <a href="/admin/courses/${lesson.course_id}/lessons/${lesson.id}/test" class="btn btn-secondary course-lesson__action-btn" data-spa-link>
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
