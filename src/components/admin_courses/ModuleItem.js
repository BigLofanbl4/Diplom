import { ModuleItemTemplate } from './ModuleItem.template.js';
import LessonCard from './LessonCard';

export default class ModuleItem {
  constructor(moduleData) {
    if (!moduleData) {
      throw new Error('moduleData is required');
    }

    this.moduleData = moduleData;
    this.moduleElement = null;
    this.lessonsContainer = null;
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = ModuleItemTemplate(this.moduleData);
    this.moduleElement = wrapper.querySelector('[data-module-id]');
    this.lessonsContainer = this.moduleElement.querySelector('[data-module-lessons]');
    this._renderLessons();
    return this.moduleElement;
  }

  mount(container) {
    if (!container) return;
    if (!this.moduleElement) this.render();
    container.appendChild(this.moduleElement)
  }

  _renderLessons() {
    if (!this.lessonsContainer) return;
    const lessons = this.moduleData?.lessons ?? [];
    if (lessons.length === 0) {
      const empty = document.createElement("li");
      empty.classList.add("course-lesson", "course-lesson--empty");
      empty.textContent = "Уроков пока нет";
      this.lessonsContainer.appendChild(empty);
      return;
    }
    lessons.forEach((lessonData) => {
      const card = new LessonCard(lessonData);
      card.mount(this.lessonsContainer);
    });
  }
}
