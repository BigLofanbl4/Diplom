import BaseService from './BaseService';

export default class CourseService extends BaseService {
  // ======= COURSES =======

  static async getAllCourses() {
    return this.request("/courses");
  }

  static async getCourseById(id) {
    return this.request(`/courses/${id}`);
  }

  static async createCourse(course) {
    return this.request(
      `/courses`,
      {
        method: "POST",
        body: JSON.stringify(course),
      });
  }

  static async updateCourse(id, course) {
    return this.request(
      `/courses/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(course),
      }
    );
  }

  static async deleteCourse(id) {
    return this.request(`/courses/${id}`, { method: "DELETE" });
  }

  // ======= MODULES =======

  static async getAllCourseModules() {
    return this.request("/course-modules");
  }

  static async getCourseModuleById(id) {
    return this.request(`/course-modules/${id}`);
  }

  static async createCourseModule(module) {
    return this.request(
      `/course-modules`,
      {
        method: "POST",
        body: JSON.stringify(module),
      }
    );
  }

  static async updateCourseModule(id, module) {
    return this.request(
      `/course-modules/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(module),
      }
    )
  }

  static async deleteCourseModule(id) {
    return this.request(`/course-modules/${id}`, { method: "DELETE" });
  }

  // ======= LESSONS =======

  static async getAllCourseLessons() {
    return this.request("/course-lessons");
  }

  static async getCourseLessonById(id) {
    return this.request(`/course-lessons/${id}`);
  }

  static async createCourseLesson(lesson) {
    return this.request(
      '/course-lessons',
      {
        method: "POST",
        body: JSON.stringify(lesson),
      }
    )
  }

  static async updateCourseLesson(id, lesson) {
    return this.request(
      `/course-lessons/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(lesson),
      })
  }

  static async deleteCourseLesson(id) {
    return this.request(`/course-lessons/${id}`, { method: "DELETE" });
  }
}