import BaseService from "./BaseService";

export default class StudentService extends BaseService {
  static async getAll() {
    return await this.request('/students');
  }

  static async getById(id) {
    return await this.request(`/students/${id}`);
  }
  
  static async create(data) {
    return await this.request(
      `/students`, { 
        method: "POST",
        body: JSON.stringify(data) 
      }
    );
  }

  static async update(id, data) {
    return await this.request(
      `/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }
    );
  }

  static async delete(id) {
    return await this.request(`/students/${id}`, { method: "DELETE" });
  }
 }