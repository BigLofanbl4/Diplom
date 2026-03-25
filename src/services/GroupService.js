import BaseService from "./BaseService";


export default class GroupService extends BaseService {
  static async getAll(params = {}) {
    const response = await this.request(`/groups`, { params }, { auth: true });
    if (!Array.isArray(response.data)) {
      throw new Error("Invalid Response");
    }

    return  response;
  }

  static async getById(id) {
    return await this.request(`/groups/${id}`, {}, { auth: true });
  }

  static async create(data) {
    return await this.request(
      "/groups",
      {
        method: "POST",
        body: JSON.stringify(data)
      },
      { auth: true }
    );
  }

  static async update(id, data) {
    return await this.request(
      `/groups/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data)
      },
      { auth: true }
    );
  }

  static async delete(id) {
    return await this.request(`/groups/${id}`, { method: "DELETE" }, { auth: true });
  }
}
