import { TeacherGroupsController } from './TeacherGroups.controller';
import { TeacherStore, GroupsStore } from './TeacherGroups.stores';
import { TeacherGroupsView } from './TeacherGroups.view';
import { showAlert } from '../../../../utils/dialogs.js';

export default class TeacherGroups {
  constructor({ teacherId, containerElement }) {
    this.teacherId = Number(teacherId);
    this.containerElement = containerElement;

    this.teacherStore = null;
    this.groupsStore = null;
    this.view = null;
    this.controller = null;
  }

  async fetchData() {
    await this.teacherStore.fetchTeacherData();
    await this.groupsStore.fetchGroupsData();
  }

  setupLayers() {
    this.teacherStore = new TeacherStore({ teacherId: this.teacherId });
    this.groupsStore = new GroupsStore();
    this.view = new TeacherGroupsView({ containerElement: this.containerElement });
    this.controller = new TeacherGroupsController({
      teacherStore: this.teacherStore,
      groupsStore: this.groupsStore,
      view: this.view,
    });
  }

  mount() {
    this.controller.init();
  }

  destroy() {
    this.view?.destroy();
  }

  async draw() {
    this.setupLayers();

    try {
      await this.fetchData();
      this.mount();
    } catch (error) {
      // TODO: сделать состояние при ошибке
      await showAlert({
        title: "Ошибка загрузки",
        message: "Возникла ошибка при получении информации о группах",
        variant: "danger",
      });
      console.error(error);
    }
  }
}
