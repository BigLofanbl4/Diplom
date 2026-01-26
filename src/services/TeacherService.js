import BaseService from "./BaseService";

export default class TeacherService extends BaseService {
  static async getAll() {
    return await this.request('/teachers');
  }

  static async getById(id) {
    return await this.request(`/teachers/${id}`);
  }

  static async create(data) {
    return await this.request('/teachers', { 
      method: "POST",
      body: JSON.stringify(data) 
    });
  }

  static async update(id, data) {
    return await this.request(`/teachers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  static async delete(id) {
    return await this.request(`/teachers/${id}`, {
      method: "DELETE"
    });
  }
}

