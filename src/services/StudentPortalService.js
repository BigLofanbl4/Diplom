import BaseService from "./BaseService.js";

export default class StudentPortalService extends BaseService {
  static async getMyCourses() {
    const response = await this.request("/students/me/courses", {}, { auth: true });
    if (!Array.isArray(response.data)) {
      throw new Error("Invalid Response");
    }
    return response;
  }

  static async getMyCourseById(courseId) {
    return this.request(`/students/me/courses/${courseId}`, {}, { auth: true });
  }

  static async getMyLessonTest(courseId, lessonId) {
    return this.request(`/students/me/courses/${courseId}/lessons/${lessonId}/test`, {}, { auth: true });
  }

  static async submitLessonTest(courseId, lessonId, answers) {
    return this.request(
      `/students/me/courses/${courseId}/lessons/${lessonId}/test-attempts`,
      {
        method: "POST",
        body: JSON.stringify({ answers }),
      },
      { auth: true }
    );
  }

  static async submitHomework(courseId, lessonId, data) {
    const formData = new FormData();
    if (data.text) {
      formData.append("text", data.text);
    }
    (data.files ?? []).forEach((file) => {
      if (file instanceof File) {
        formData.append("files", file);
      }
    });

    return this.request(
      `/students/me/courses/${courseId}/lessons/${lessonId}/homework-submission`,
      {
        method: "POST",
        body: formData,
      },
      { auth: true }
    );
  }
}
