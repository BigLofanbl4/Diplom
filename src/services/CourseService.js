import BaseService from './BaseService';

export default class CourseService extends BaseService {
  static async getAll() {
    return this.request("/courses", {}, { auth: true });
  }

  static async getById(id) {
    return this.request(`/courses/${id}`, {}, { auth: true });
  }

  static async create(course) {
    return this.request(
      `/courses`,
      {
        method: "POST",
        body: JSON.stringify(course),
      },
      { auth: true }
    );
  }

  static async update(id, course) {
    return this.request(
      `/courses/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(course),
      },
      { auth: true }
    );
  }

  static async delete(id) {
    return this.request(`/courses/${id}`, { method: "DELETE" }, { auth: true });
  }
}
