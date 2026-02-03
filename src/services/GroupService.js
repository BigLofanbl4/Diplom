import BaseService from "./BaseService";


export default class GroupService extends BaseService {
  static async getAll() {
    return await this.request("/groups");
  }

  static async getById(id) {
    return await this.request(`/groups/${id}`);
  }

  static async create(data) {
    return await this.request(
      "/groups",
      {
        method: "POST",
        body: JSON.stringify(data)
      }
    );
  }

  static async update(id, data) {
    return await this.request(
      `/groups/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data)
      }
    );
  }

  static async delete(id) {
    return await this.request(`/groups/${id}`, { method: "DELETE" });
  }
}