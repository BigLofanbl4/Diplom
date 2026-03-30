import GroupService from "../../../../services/GroupService.js";
import TeacherService from "../../../../services/TeacherService.js";

export class GroupStore {
  constructor({ groupId }) {
    this.groupId = Number(groupId);
    this.groupData = null;
  }

  async fetchGroupData() {
    this.groupData = await GroupService.getById(this.groupId);
  }

  getSnapshot() {
    return structuredClone(this.groupData);
  }

  async assignTeacher(teacherId) {
    this.groupData = await GroupService.update(this.groupId, { teacher_id: teacherId });
  }

  async removeTeacher() {
    this.groupData = await GroupService.update(this.groupId, { teacher_id: null });
  }

}

export class TeacherStore {
  constructor() {
    this.teachers = { data: [] };
    this.searchedTeachers = { data: [] };
    this.isSearchMode = false;
    this.searchValue = "";
  }

  async fetchTeachers({ offset = null } = {}) {
    const oldTeachers = this.teachers;
    const response = await TeacherService.getAll({ limit: 50, offset });

    const mergedTeachers = new Map();
    oldTeachers.data.forEach((teacher) => mergedTeachers.set(teacher.id, teacher));
    response.data.forEach((teacher) => mergedTeachers.set(teacher.id, teacher));

    this.teachers = {
      ...response,
      data: Array.from(mergedTeachers.values())
    };
  }

  async fetchSearchTeachers({ search, limit = null, offset = null}) {
    if (search.trim() === "") {
      this.isSearchMode = false;
      return;
    }

    this.searchValue = search;
    this.isSearchMode = true;
    const response = await TeacherService.getAll({ limit, offset, search })

    if (!offset) {
      this.searchedTeachers = response;
      return;
    }

    const mergedTeachers = new Map();
    const old = this.searchedTeachers.data;

    old.forEach((teacher) => {
      mergedTeachers.set(teacher.id, teacher);
    });

    response.data.forEach((teacher) => {
      mergedTeachers.set(teacher.id, teacher);
    });

    this.searchedTeachers = {
      ...response,
      data: Array.from(mergedTeachers.values())
    };
  }

  getSnapshot() {
    const source = this.isSearchMode ? this.searchedTeachers : this.teachers;
    return structuredClone(source.data);
  }

  getTeacher(teacherId) {
    const source = this.isSearchMode ? this.searchedTeachers : this.teachers;
    const target = source.data.find((teacher) => teacher.id === teacherId);

    return target ?? null;
  }
}
