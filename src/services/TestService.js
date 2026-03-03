import BaseService from './BaseService';


export default class TestService extends BaseService {
  static async getTestOrNull(courseId, lessonId) {
    try {
      return await this.request(`/courses/${courseId}/lessons/${lessonId}/test`, {}, { auth: true });
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  static async create(courseId, lessonId, data) {
    return await this.request(
      `/courses/${courseId}/lessons/${lessonId}/test`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      { auth: true }
    );
  }

  static async update(courseId, lessonId, data) {
    return await this.request(
      `/courses/${courseId}/lessons/${lessonId}/test`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      },
      { auth: true }
    );
  }

  static async delete(courseId, lessonId) {
    return await this.request(
      `/courses/${courseId}/lessons/${lessonId}/test`,
      {
        method: 'DELETE'
      },
      { auth: true }
    );
  }

}
