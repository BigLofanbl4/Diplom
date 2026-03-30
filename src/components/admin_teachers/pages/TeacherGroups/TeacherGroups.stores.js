import TeacherService from '../../../../services/TeacherService';
import GroupService from '../../../../services/GroupService';

export class TeacherStore {
  constructor({ teacherId }) {
    this.teacherId = teacherId;
    this.originalTeacher = null;
    this.draftGroups = [];
  }

  async fetchTeacherData() {
    this.originalTeacher = await TeacherService.getById(this.teacherId);
    this.draftGroups = this.originalTeacher.groups ? [...this.originalTeacher.groups] : [];
  }

  addGroup(newGroup) {
    const isDuplicate = this.draftGroups.some((group) => group.id === newGroup.id);
    if (isDuplicate) return;

    this.draftGroups.push(newGroup);
  }

  removeGroup(groupId) {
    const normalizedGroupId = Number(groupId);
    this.draftGroups = this.draftGroups.filter((group) => group.id !== normalizedGroupId);
  }

  isChanged() {
    const originalIds = this.originalTeacher.group_ids ?? [];
    const draftIds = this.draftGroups.map((group) => group.id);

    const same = draftIds.length === originalIds.length &&
      draftIds.every((id) => originalIds.includes(id));

    return !same;
  }

  getSnapshot() {
    return structuredClone({
      ...this.originalTeacher,
      groups: this.draftGroups,
      group_ids: this.draftGroups.map((group) => group.id),
    });
  }

  getDraftGroups() {
    return structuredClone(this.draftGroups);
  }

  commitDraft() {
    this.originalTeacher = structuredClone({
      ...this.originalTeacher,
      groups: this.draftGroups,
      group_ids: this.draftGroups.map((group) => group.id),
    });
  }
}

export class GroupsStore {
  constructor() {
    this.fetchedGroups = { data: [] };
    this.searchResults = { data: [] };
    this.isSearchMode = false;
    this.searchValue = "";
  }

  async fetchGroupsData(offset = null) {
    const oldGroups = this.fetchedGroups.data;
    const response = await GroupService.getAll({ limit: 50, offset });
    const mergedGroups = new Map();

    oldGroups.forEach((group) => {
      mergedGroups.set(group.id, group);
    });

    response.data.forEach((group) => {
      mergedGroups.set(group.id, group);
    });

    this.fetchedGroups = {
      ...response,
      data: Array.from(mergedGroups.values()),
    };
  }

  async fetchSearchedGroups({ search = null, offset = null }) {
    if (!search || search.trim() === '') {
      this.isSearchMode = false;
      this.searchResults = { data: [] };
      return;
    }
    this.searchValue = search;
    this.isSearchMode = true;

    const oldGroups = this.searchResults.data;
    const response = await GroupService.getAll({ limit: 50, offset, search });

    if (!offset) {
      this.searchResults = response;
      return;
    }

    const mergedGroups = new Map();

    oldGroups.forEach((group) => {
      mergedGroups.set(group.id, group);
    });

    response.data.forEach((group) => {
      mergedGroups.set(group.id, group);
    });

    this.searchResults = {
      ...response,
      data: Array.from(mergedGroups.values())
    };
  }

  findGroup(groupId) {
    const normalizedGroupId = Number(groupId);
    const source = this.isSearchMode ? this.searchResults.data : this.fetchedGroups.data;
    return source.find((group) => group.id === normalizedGroupId) ?? null;
  }

  getSnapshot() {
    const source = this.isSearchMode ? this.searchResults.data : this.fetchedGroups.data;
    return structuredClone(source);
  }
}
