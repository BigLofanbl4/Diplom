import BaseService from "./BaseService";

export default class ModuleService extends BaseService {
  static async getAll() {
    return this.request("/course-modules");
  }

  static async getById(id) {
    return this.request(`/course-modules/${id}`);
  }

  static async create(data) {
    return this.request(
      "/course-modules",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  static async update(id, data) {
    return this.request(
      `/course-modules/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  static async delete(id) {
    return this.request(`/course-modules/${id}`, { method: "DELETE" });
  }
}
