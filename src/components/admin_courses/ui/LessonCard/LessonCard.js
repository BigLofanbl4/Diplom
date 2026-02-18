import { LessonCardTemplate } from "./LessonCard.template.js";

export default class LessonCard {
  constructor(lessonData) {
    if (!lessonData) {
      throw new Error("lessonData is required");
    }
    this.data = lessonData;
    this.lessonElement = null;
  }

  render() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = LessonCardTemplate(this.data);
    this.lessonElement = wrapper.querySelector('[data-lesson-id]');
    return this.lessonElement;
  }

  mount(container) {
    if (!container) return;
    if (!this.lessonElement) this.render();
    container.appendChild(this.lessonElement);
  }
}
