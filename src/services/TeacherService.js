import BaseService from "./BaseService";

export default class TeacherService extends BaseService {
  static async getAll() {
    return await this.request('/teachers', {}, { auth: true });
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
