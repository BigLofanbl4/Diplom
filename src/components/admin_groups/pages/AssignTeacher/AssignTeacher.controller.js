export default class AssignTeacherController {
  constructor({ groupStore, teacherStore, view }) {
    this.groupStore = groupStore;
    this.teacherStore = teacherStore;
    this.view = view;
    this.lastFilterRequestId = 0;
  }

  async init() {
    try {
      await this.groupStore.fetchGroupData();
      await this.teacherStore.fetchTeachers({ groupId: this.groupStore.groupId });
    } catch (error) {
      alert("Ошибка загрузки данных");
      console.error(error);
    }

    this.view.render(this.groupStore.getSnapshot());
    this.syncView();
    this.view.bindHandlers({
      handleRemove: this.handleRemove.bind(this),
      handleAssign: this.handleAssign.bind(this),
      handleApplySchedule: this.handleApplySchedule.bind(this),
      handleFilter: this.handleFilter.bind(this),
      handleLoadMore: this.handleLoadMore.bind(this)
    });
    this.view.assignHandlers();
  }

  syncView() {
    const groupSnapshot = this.groupStore.getSnapshot();
    const groupTeacher = groupSnapshot.teacher ?? null;
    const teachers = this.teacherStore
      .getSnapshot()
      .filter((teacher) => teacher.id !== groupTeacher?.id)
      .sort((left, right) => {
        const leftAvailable = left.availability_for_group?.is_available ? 1 : 0;
        const rightAvailable = right.availability_for_group?.is_available ? 1 : 0;
        return rightAvailable - leftAvailable;
      });

    this.view.toggleRemoveTeacherBtn(groupTeacher);
    this.view.renderGroupSchedule(groupSnapshot);
    this.view.renderTeachersTable(teachers);
    this.view.renderGroupTeacher(groupTeacher);
  }

  async syncSchedulingCriteria() {
    const payload = this.view.getSchedulingPayload();
    await this.groupStore.updateScheduling(payload);
  }

  async handleAssign(teacherId) {
    try {
      await this.syncSchedulingCriteria();
      await this.groupStore.assignTeacher(teacherId);
      await this.teacherStore.fetchTeachers({ groupId: this.groupStore.groupId });
      this.syncView();
    } catch (error) {
      alert("Ошибка при попытке назначить учителя");
      console.error(error);
    }
  }

  async handleRemove() {
    try {
      await this.groupStore.removeTeacher();
      await this.teacherStore.fetchTeachers({ groupId: this.groupStore.groupId });
      this.syncView();
    } catch (error) {
      alert("Ошибка при попытке снять преподавателя");
      console.error(error);
    }
  }

  async handleApplySchedule() {
    try {
      await this.syncSchedulingCriteria();
      await this.teacherStore.fetchTeachers({ groupId: this.groupStore.groupId });
      this.syncView();
    } catch (error) {
      alert("Ошибка при обновлении расписания группы");
      console.error(error);
    }
  }

  async handleFilter(searchInput) {
    const requestId = ++this.lastFilterRequestId;

    try {
      await this.syncSchedulingCriteria();
      await this.teacherStore.fetchSearchTeachers({
        search: searchInput,
        limit: 50,
        groupId: this.groupStore.groupId,
      });

      if (requestId !== this.lastFilterRequestId) return;

      this.syncView();
    } catch (error) {
      if (requestId !== this.lastFilterRequestId) return;

      alert('Возникла ошибка при фильтрации преподавателей');
      console.log(error);
    }
  }

  async handleLoadMore() {
    const offset = this.teacherStore.getSnapshot().length;
    await this.syncSchedulingCriteria();
    if (this.teacherStore.isSearchMode) {
      const search = this.teacherStore.searchValue;
      await this.teacherStore.fetchSearchTeachers({ search, offset, groupId: this.groupStore.groupId });
    } else {
      await this.teacherStore.fetchTeachers({ offset, groupId: this.groupStore.groupId });
    }
    this.syncView();
  }

  destroy() {
    this.view.destroy();
  }
}
