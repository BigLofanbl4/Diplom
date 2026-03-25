import TeacherService from '../../../../services/TeacherService';

export class TeacherGroupsController {
  constructor({ teacherStore, groupsStore, view }) {
    this.teacherStore = teacherStore;
    this.groupsStore = groupsStore;
    this.view = view;
    this.lastFilterRequestId = 0;
  }

  async init() {
    this.view.render(this.teacherStore.getSnapshot());
    this.syncView();
    this.view.bindHandlers({
      handleAddGroup: this.handleAddGroup.bind(this),
      handleRemoveGroup: this.handleRemoveGroup.bind(this),
      handleSave: this.handleSave.bind(this),
      handleFilter: this.handleFilter.bind(this),
    });
    this.view.handleEvents();
  }

  syncView() {
    const allGroups = this.groupsStore.getSnapshot();
    const teacherGroups = this.teacherStore.getDraftGroups();
    const availableGroups = allGroups.filter(
      (group) => !teacherGroups.some((teacherGroup) => teacherGroup.id === group.id),
    );

    this.view.toggleSaveButton(this.teacherStore.isChanged());
    this.view.renderTeacherGroups(teacherGroups);
    this.view.renderGroupsTable(availableGroups);
  }

  handleAddGroup(groupId) {
    const group = this.groupsStore.findGroup(groupId);
    if (!group) return;

    this.teacherStore.addGroup(group);
    this.syncView();
  }

  handleRemoveGroup(groupId) {
    this.teacherStore.removeGroup(groupId);
    this.syncView();
  }

  async handleSave() {
    try {
      const teacherData = this.teacherStore.getSnapshot();
      await TeacherService.update(teacherData.id, { group_ids: teacherData.group_ids });
      alert('Сохранено!');
      this.teacherStore.commitDraft();
      this.syncView();
    } catch (error) {
      console.log(error);
      alert('Возникла ошибка при сохранении');
    }
  }

  async handleFilter(searchText) {
    const requestId = ++this.lastFilterRequestId;

    try {
      await this.groupsStore.fetchSearchedGroups({ offset: 0, search: searchText });

      if (requestId !== this.lastFilterRequestId) return;

      this.syncView();
    } catch (error) {
      if (requestId !== this.lastFilterRequestId) return;

      alert('Возникла ошибка при фильтрации групп');
      console.log(error);
    }
  }
}
