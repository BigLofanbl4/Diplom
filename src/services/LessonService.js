import BaseService from "./BaseService";

export default class LessonService extends BaseService {
  static getFormData(data) {
    const formData = new FormData();
    for (const key in data) {
      if (data[key] === null || data[key] === undefined) continue;
      if (Array.isArray(data[key])) {
        const arr = data[key];
        arr.forEach(item => formData.append(key, item));
      } else {
        formData.append(key, data[key]);
      }
    }
    return formData;
  }

  static async getAll() {
    return this.request("/course-lessons");
  }

  static async getById(id) {
    return this.request(`/course-lessons/${id}`);
  }

  static async create(data) {
    const formData = this.getFormData(data);
    return this.request(
      "/course-lessons",
      {
        method: "POST",
        body: formData,
      }
    );
  }

  static async update(id, data) {
    const formData = this.getFormData(data);
    return this.request(
      `/course-lessons/${id}`,
      {
        method: "PATCH",
        body: formData,
      }
    );
  }

  static async delete(id) {
    return this.request(`/course-lessons/${id}`, { method: "DELETE" });
  }
}
