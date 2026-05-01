import BaseService from "./BaseService";

export default class TaskService extends BaseService {
  static async getAll() {
    return this.request("/tasks", {}, { auth: true });
  }

  static async getOptions() {
    return this.request("/tasks/options", {}, { auth: true });
  }

  static async create(data) {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }, { auth: true });
  }

  static async updateStatus(id, status) {
    return this.request(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }, { auth: true });
  }

  static async delete(id) {
    return this.request(`/tasks/${id}`, {
      method: "DELETE",
    }, { auth: true });
  }
}
