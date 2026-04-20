import BaseService from "./BaseService.js";

export default class ManagerService extends BaseService {
  static async getAll(params = {}) {
    const response = await this.request("/managers", { params }, { auth: true });
    if (!Array.isArray(response.data)) {
      throw new Error("Invalid Response");
    }

    return response;
  }

  static async getById(id) {
    return this.request(`/managers/${id}`, {}, { auth: true });
  }

  static async create(data) {
    return this.request(
      "/managers",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      { auth: true }
    );
  }

  static async update(id, data) {
    return this.request(
      `/managers/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      { auth: true }
    );
  }

  static async delete(id) {
    return this.request(`/managers/${id}`, { method: "DELETE" }, { auth: true });
  }
}
