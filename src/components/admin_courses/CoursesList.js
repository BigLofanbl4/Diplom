import listTemplate from "./CoursesList.html?raw";
import CourseService from "../../services/CourseService.js";
import CardListComponent from "../../core/CardListComponent.js";

class CourseCard {
  constructor(cardData) {
    this.cardData = cardData;
  }

  render() {
    return `
    <article class="card" data-course-id="${this.cardData.id}">
      <header class="card__header">
          <h4 class="card__title" data-card-title>${this.cardData.title}</h4>
          <div class="card__badges">
              <span class="card__badge" data-course-modules>Модулей: ${this.cardData.modules?.length ?? 0}</span>
              <span class="card__badge" data-course-lessons>Уроков: ${this.cardData.lessons?.length ?? 0}</span>
          </div>
      </header>
      <p class="card__description" data-card-desc>${this.cardData.description}</p>
      <footer class="card__footer">
          <a href="/admin/courses/${this.cardData.id}" class="btn btn-primary" data-spa-link data-course-link>Перейти на страницу курса</a>
          <button class="btn btn-primary" data-action="delete">Удалить курс</button>
      </footer>
    </article>
   `
  }

  bindEvents(DOMElement) {
    DOMElement.addEventListener("click", async (e) => {
      const courseCard = e.target.closest("[data-course-id]");
      if (!courseCard) return;
      const id = Number(courseCard.dataset.courseId);
      if (e.target.dataset.action === "delete") {
        const success = await CourseService.deleteCourse(id);
        if (success) courseCard.remove();
      }
    });
  }
}

function courseCardRenderer(cardData) {
  return new CourseCard(cardData);
}

export default class CoursesList extends CardListComponent {
  constructor() {
    super(listTemplate, "courses-list", courseCardRenderer, "Курсов еще нет");
  }

  async fetchCardData() {
    try {
      this.cardsData = await CourseService.getAllCourses();
    } catch (error) {
      console.error(error);
    }
  }

  async draw() {
    this.destroy();
    await this.fetchCardData();
    this.render();
    this.mount();
  }
}
