import template from './TeacherGroups.html?raw';
import TeacherService from '../../../../services/TeacherService';
import GroupService from '../../../../services/GroupService';

class TeacherStore {
  constructor({ teacherId }) {
    this.teacherId = teacherId;
    this.teacherData = null;
    this.originalGroupIds = null;
  }

  async fetchTeacherData() {
    try {
      this.teacherData = await TeacherService.getById(this.teacherId);
      this.originalGroupIds = [...this.teacherData.group_ids];
    } catch (error) {
      alert("Произошла ошибка при получение данных учителя");
      console.error(error);
    }
  }

  addGroup(group) {
    this.teacherData.group_ids.push(group.id);
    this.teacherData.groups.push(group);
  }

  removeGroup(group_id) {
    const normalizedGroupId = Number(group_id);

    this.teacherData.group_ids = this.teacherData.group_ids.filter(id => id !== normalizedGroupId);
    this.teacherData.groups = this.teacherData.groups.filter(group => group.id !== normalizedGroupId);
  }

  isChanged() {
    return this.teacherData.group_ids.length === this.originalGroupIds.length &&
           this.teacherData.group_ids.every(id => this.originalGroupIds.includes(id));
  }

  getSnapshot() {
    return structuredClone(this.teacherData);
  }
}

class GroupsStore {
  constructor({ teacherId }) {
    this.teacherId = teacherId;
    this.groupsData = [];
    this.fetchedGroups = { data: [] };
  }

  async fetchGroupsData(offset = null) {
    try {
      const old = this.fetchedGroups.data;
      this.fetchedGroups = await GroupService.getAll({ limit: 50, offset });
      this.fetchedGroups.data = [...old, ...this.fetchedGroups.data];
      console.log(this.fetchedGroups);
    } catch (error) {
      alert("Произошла ошибка при получении данных групп");
      console.error(error);
    }
  }

  async fetchSearchedGroups({search = null, offset = null}) {
    try {
      this.fetchedGroups = await GroupService.getAll({ limit: 50, offset, search });
    } catch (error) {
      alert("Произошла ошибка при получении данных групп");
      console.error(error);
    }
  }

  filterGroups(teacherState) {
    const teacherGroups = teacherState.group_ids;
    this.groupsData = this.fetchedGroups.data.filter((group) => !teacherGroups.includes(group.id));
  }

  findGroup(group_id) {
    const normalizedGroupId = Number(group_id);
    return this.fetchedGroups.data.find((group) => group.id === normalizedGroupId) ?? null;
  }

  getSnapshot() {
    return structuredClone(this.groupsData);
  }
}

function renderTeacherGroupRow(groupData) {
  return `
    <tr class="table__row" data-group-id="${groupData.id}">
        <td class="table__col table__id-col">${groupData.id}</td>
        <td class="table__col table__small-col">${groupData.group_number}</td>
        <td class="table__col table__medium-col">${groupData.course?.title ?? "Отсутствует"}</td>
        <td class="table__col table__small-col">
            <button class="btn btn-danger" data-action="removeGroup">Снять</button>
        </td>
    </tr>     
  `;
}

function renderGroupRow(groupData) {
  return `
    <tr class="table__row" data-group-id="${groupData.id}">
        <td class="table__col table__id-col">${groupData.id}</td>
        <td class="table__col table__small-col">${groupData.group_number}</td>
        <td class="table__col table__medium-col">${groupData.course?.title ?? "Отсутствует"}</td>
        <td class="table__col table__medium-col">${groupData?.teacher_id ?? "Отсутствует"}</td>
        <td class="table__col table__small-col">
            <button class="btn btn-primary" data-action="addGroup">Назначить</button>
        </td>
    </tr>     
  `;
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  }
}

class TeacherGroupView {
  constructor({ containerElement }) {
    this.template = template;
    this.containerElement = containerElement;
    this.pageElement = null;

    this.teacherGroupsTable = null;
    this.groupsTable = null;
    this.saveBtn = null;
    this.textFilter = null;

    this.handleAddGroup = null;
    this.handleRemoveGroup = null;
    this.handleSave = null;
  }

  render(teacherState, groupsState) {
    if (!this.containerElement) {
      this.containerElement = document.getElementById("component");
    }
    this.pageElement = document.createElement("div");
    this.pageElement.innerHTML = this.template;

    this.title = this.pageElement.querySelector("[data-title]")
    this.teacherGroupsTable = this.pageElement.querySelector("[data-teacher-groups]");
    this.groupsTable = this.pageElement.querySelector("[data-all-groups]");
    this.saveBtn = this.pageElement.querySelector("[data-action='save']");
    this.textFilter = this.pageElement.querySelector("[data-text-filter]");

    this.title.textContent = `Группы учителя ${teacherState.last_name} ${teacherState.first_name}`;

    this.renderTeacherGroups(teacherState);
    this.renderGroupsTable(groupsState);

    this.containerElement.append(this.pageElement);
  }

  renderTeacherGroups(teacherState) {
    const tbody = this.teacherGroupsTable.querySelector("tbody");
    tbody.innerHTML = teacherState.groups.reduce((html, group) => {
      return html + renderTeacherGroupRow(group);
    }, "");
  }

  renderGroupsTable(groupsState) {
    const tbody = this.groupsTable.querySelector("tbody");
    tbody.innerHTML = groupsState.reduce((html, group) => {
      return html + renderGroupRow(group);
    }, "");
  }

  bindHandlers({ handleAddGroup, handleRemoveGroup, handleSave, handleFilter }) {
    this.handleAddGroup = handleAddGroup;
    this.handleRemoveGroup = handleRemoveGroup;
    this.handleSave = handleSave;
    this.handleFilter = handleFilter;
  }

  handleEvents() {
    this.teacherGroupsTable.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action || action !== "removeGroup") return;

      const groupId = event.target.closest("[data-group-id]")?.dataset.groupId;
      this.handleRemoveGroup(groupId);
    });

    this.groupsTable.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action || action !== "addGroup") return;

      const groupId = event.target.closest("[data-group-id]")?.dataset.groupId;
      this.handleAddGroup(groupId);
    });

    this.saveBtn.addEventListener("click", async () => this.handleSave());

    this.textFilter.addEventListener("input", async (event) => {
      const input = event.target;
      const debounceHandleFilter = debounce(this.handleFilter, 400);
      debounceHandleFilter(input.value);
    });
  }

  toggleSaveBtn(state) {
    this.saveBtn.disabled = state;
  }

  destroy() {
    if (this.pageElement) this.pageElement.remove();
  }
}

class TeacherGroupsController {
  constructor({ teacherStore, groupsStore, view}) {
    this.teacherStore = teacherStore;
    this.groupsStore = groupsStore;
    this.view = view;
  }

  async init() {
    this.view.render(this.teacherStore.getSnapshot(), this.groupsStore.getSnapshot());
    this.view.bindHandlers({
      handleAddGroup: this.handleAddGroup.bind(this),
      handleRemoveGroup: this.handleRemoveGroup.bind(this),
      handleSave: this.handleSave.bind(this),
      handleFilter: this.handleFilter.bind(this),
    });
    this.view.handleEvents();
  }

  handleAddGroup(groupId) {
    const group = this.groupsStore.findGroup(groupId);

    this.teacherStore.addGroup(group);
    const newTeacherState = this.teacherStore.getSnapshot();

    this.groupsStore.filterGroups(newTeacherState);
    const newGroupsState = this.groupsStore.getSnapshot();

    this.view.toggleSaveBtn(this.teacherStore.isChanged());
    this.view.renderTeacherGroups(newTeacherState);
    this.view.renderGroupsTable(newGroupsState);
  }

  handleRemoveGroup(groupId) {
    this.teacherStore.removeGroup(groupId);
    const newTeacherState = this.teacherStore.getSnapshot();

    this.groupsStore.filterGroups(newTeacherState);
    const newGroupsState = this.groupsStore.getSnapshot();

    this.view.toggleSaveBtn(this.teacherStore.isChanged());
    this.view.renderTeacherGroups(newTeacherState);
    this.view.renderGroupsTable(newGroupsState);
  }

  async handleSave() {
    const teacherData = this.teacherStore.getSnapshot();
    const updated = await TeacherService.update(teacherData.id, { group_ids: teacherData.group_ids });
    if (!updated) {
      alert("Произошла ошибка при обновлении");
      return;
    }
    alert("Сохранено!");
  }

  async handleFilter(searchText) {
    const teacherState = this.teacherStore.getSnapshot();

    await this.groupsStore.fetchSearchedGroups({ offset: 0, search: searchText });
    this.groupsStore.filterGroups(teacherState);

    const groupsState = this.groupsStore.getSnapshot();
    this.view.renderGroupsTable(groupsState);
  }
}

export default class TeacherGroups {
  constructor({ teacherId, containerElement }) {
    this.teacherId = Number(teacherId);
    this.template = null;
    this.containerElement = containerElement;

    this.title = null;
    this.teacherGroupsTable = null;
    this.groupsTable = null;

    this.teacherStore = null;
    this.groupsStore = null;
    this.view = null;
    this.controller = null;
  }

  async fetchData() {
    await this.teacherStore.fetchTeacherData();
    await this.groupsStore.fetchGroupsData();
    this.groupsStore.filterGroups(this.teacherStore.getSnapshot());
  }

  setupLayers() {
    this.teacherStore = new TeacherStore({ teacherId: this.teacherId });
    this.groupsStore = new GroupsStore( { teacherId: this.teacherId });
    this.view = new TeacherGroupView({ containerElement: this.containerElement });
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
    await this.fetchData();
    this.mount();
  }
}