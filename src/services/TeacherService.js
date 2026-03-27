import BaseService from "./BaseService";

export default class TeacherService extends BaseService {
  static async getAll(params = {}) {
    const response = await this.request('/teachers', { params }, { auth: true });
    if (!Array.isArray(response.data)) {
      throw new Error("Invalid Response");
    }

    return response;
  }

  static async getById(id) {
    return await this.request(`/teachers/${id}`, {}, { auth: true });
  }

  static async create(data) {
    return await this.request('/teachers', { 
      method: "POST",
      body: JSON.stringify(data) 
    }, { auth: true });
  }

  static async update(id, data) {
    return await this.request(`/teachers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }, { auth: true });
  }

  static async delete(id) {
    return await this.request(`/teachers/${id}`, {
      method: "DELETE"
    }, { auth: true });
  }
}
