import BaseService from "./BaseService";

export default class LessonService extends BaseService {
  static getFormData(data) {
    const formData = new FormData();
    for (const key in data) {
      if (data[key] === null || data[key] === undefined) continue;
      if (key === "materials") {
        const arr = data[key];
        arr.forEach(material => {
          if (material instanceof File && material.size > 0 && material.name) {
            formData.append(key, material);
          }
        })
      } else if (Array.isArray(data[key])) {
        const arr = data[key];
        arr.forEach(item => formData.append(key, item));
      } else {
        formData.append(key, data[key]);
      }
    }
    return formData;
  }

  static async getAll(courseId) {
    return this.request(`/courses/${courseId}/lessons`);
  }

  static async getById(courseId, lessonId) {
    return this.request(`/courses/${courseId}/lessons/${lessonId}`);
  }

  static async create(courseId, data) {
    const formData = this.getFormData(data);
    return this.request(
      `/courses/${courseId}/lessons`,
      {
        method: "POST",
        body: formData,
      }
    );
  }

  static async update(courseId, lessonId, data) {
    const formData = this.getFormData(data);
    return this.request(
      `/courses/${courseId}/lessons/${lessonId}`,
      {
        method: "PATCH",
        body: formData,
      }
    );
  }

  static async delete(courseId, lessonId) {
    return this.request(`/courses/${courseId}/lessons/${lessonId}`, { method: "DELETE" });
  }
}
