export default class AssignTeacherController {
  constructor({ groupStore, teacherStore, view }) {
    this.groupStore = groupStore;
    this.teacherStore = teacherStore;
    this.view = view;
    this.lastFilterRequestId = 0;
  }

  async init() {
    try {
      await Promise.all([
        this.groupStore.fetchGroupData(),
        this.teacherStore.fetchTeachers()
      ]);
    } catch (error) {
      alert("Ошибка загрузки данных");
      console.error(error);
    }

    this.view.render(this.groupStore.getSnapshot());
    this.syncView();
    this.view.bindHandlers({
      handleRemove: this.handleRemove.bind(this),
      handleAssign: this.handleAssign.bind(this),
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
      .filter((teacher) => teacher.id !== groupTeacher?.id);

    this.view.renderTeachersTable(teachers);
    this.view.renderGroupTeacher(groupTeacher);
  }

  async handleAssign(teacherId) {
    try {
      await this.groupStore.assignTeacher(teacherId);
      this.syncView();
    } catch (error) {
      alert("Ошибка при попытке назначить учителя");
      console.error(error);
    }
  }

  async handleRemove() {
    try {
      await this.groupStore.removeTeacher();
      this.syncView();
    } catch (error) {
      alert("Ошибка при попытке снять преподавателя");
      console.error(error);
    }
  }

  async handleFilter(searchInput) {
    const requestId = ++this.lastFilterRequestId;

    try {
      await this.teacherStore.fetchSearchTeachers({ search: searchInput, limit: 50 });

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
    if (this.teacherStore.isSearchMode) {
      const search = this.teacherStore.searchValue;
      await this.teacherStore.fetchSearchTeachers({search, offset});
    } else {
      await this.teacherStore.fetchTeachers({ offset });
    }
    this.syncView();
  }

  destroy() {
    this.view.destroy();
  }
}
