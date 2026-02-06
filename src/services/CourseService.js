import BaseService from './BaseService';

export default class CourseService extends BaseService {
  static async getAll() {
    return this.request("/courses");
  }

  static async getById(id) {
    return this.request(`/courses/${id}`);
  }

  static async create(course) {
    return this.request(
      `/courses`,
      {
        method: "POST",
        body: JSON.stringify(course),
      });
  }

  static async update(id, course) {
    return this.request(
      `/courses/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(course),
      }
    );
  }

  static async delete(id) {
    return this.request(`/courses/${id}`, { method: "DELETE" });
  }
}
