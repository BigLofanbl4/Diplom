import BaseService from "./BaseService";

export default class StudentService extends BaseService {
  static async getAll() {
    return await this.request('/students', {}, { auth: true });
  }

  static async getById(id) {
    return await this.request(`/students/${id}`, {}, { auth: true });
  }
  
  static async create(data) {
    return await this.request(
      `/students`, { 
        method: "POST",
        body: JSON.stringify(data) 
      },
      { auth: true }
    );
  }

  static async update(id, data) {
    return await this.request(
      `/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      },
      { auth: true }
    );
  }

  static async delete(id) {
    return await this.request(`/students/${id}`, { method: "DELETE" }, { auth: true });
  }
 }
