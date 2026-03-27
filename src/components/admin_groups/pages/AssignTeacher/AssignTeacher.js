import AssignTeacherController from "./AssignTeacher.controller.js";
import AssignTeacherView from "./AssignTeacher.view.js";
import { GroupStore, TeacherStore } from "./AssignTeacher.stores.js";

export default class AssignTeacher {
  constructor({ groupId, containerElement = null }) {
    this.groupId = Number(groupId);
    this.containerElement = containerElement;

    this.controller = null;
    this.view = null;
    this.groupStore = null;
    this.teacherStore = null;
  }

  _setupLayers() {
    this.groupStore = new GroupStore({groupId: this.groupId});
    this.teacherStore = new TeacherStore();
    this.view = new AssignTeacherView({containerElement: this.containerElement});
    this.controller = new AssignTeacherController({
      groupStore: this.groupStore,
      teacherStore: this.teacherStore,
      view: this.view,
    });
  }

  async draw() {
    this._setupLayers();
    await this.controller.init();
  }

  destroy() {
    this.controller?.destroy();
    this.controller = null;
    this.view = null;
    this.groupStore = null;
    this.teacherStore = null;
  }
}