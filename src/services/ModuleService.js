import BaseService from "./BaseService";

export default class ModuleService extends BaseService {
  static async getAll(courseId) {
    return this.request(`/courses/${courseId}/modules`);
  }

  static async getById(courseId, moduleId) {
    return this.request(`/courses/${courseId}/modules/${moduleId}`);
  }

  static async create(courseId, data) {
    return this.request(
      `/courses/${courseId}/modules`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  static async update(courseId, moduleId, data) {
    return this.request(
      `/courses/${courseId}/modules/${moduleId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  static async delete(courseId, moduleId) {
    return this.request(`/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" });
  }
}
