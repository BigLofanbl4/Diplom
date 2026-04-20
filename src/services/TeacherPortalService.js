import BaseService from "./BaseService.js";

export default class TeacherPortalService extends BaseService {
  static async getMyGroups() {
    const response = await this.request("/teachers/me/groups", {}, { auth: true });
    if (!Array.isArray(response.data)) {
      throw new Error("Invalid Response");
    }
    return response;
  }

  static async getMyGroupById(groupId) {
    return this.request(`/teachers/me/groups/${groupId}`, {}, { auth: true });
  }

  static async getMyPreferences() {
    return this.request("/teachers/me/preferences", {}, { auth: true });
  }

  static async getLessonHomeworkSubmissions(groupId, lessonId) {
    return this.request(`/teachers/me/groups/${groupId}/lessons/${lessonId}/homework-submissions`, {}, { auth: true });
  }

  static async reviewLessonHomeworkSubmission(groupId, lessonId, submissionId, payload) {
    return this.request(
      `/teachers/me/groups/${groupId}/lessons/${lessonId}/homework-submissions/${submissionId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      { auth: true }
    );
  }

  static async getLessonTestAttempts(groupId, lessonId) {
    return this.request(`/teachers/me/groups/${groupId}/lessons/${lessonId}/test-attempts`, {}, { auth: true });
  }

  static async updateMyPreferences(data) {
    return this.request(
      "/teachers/me/preferences",
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
      { auth: true }
    );
  }
}
