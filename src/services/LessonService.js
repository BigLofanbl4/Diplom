import BaseService from "./BaseService";

export default class LessonService extends BaseService {
  static async getAll() {
    return this.request("/course-lessons");
  }

  static async getById(id) {
    return this.request(`/course-lessons/${id}`);
  }

  static async create(data) {
    return this.request(
      "/course-lessons",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  static async update(id, data) {
    return this.request(
      `/course-lessons/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  static async delete(id) {
    return this.request(`/course-lessons/${id}`, { method: "DELETE" });
  }
}
