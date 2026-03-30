import template from './TeacherGroups.html?raw';
import { debounce } from '../../../../utils/debounce';

export class TeacherGroupsView {
  constructor({ containerElement }) {
    this.template = template;
    this.containerElement = containerElement;
    this.pageElement = null;

    this.teacherGroupsTable = null;
    this.groupsTable = null;
    this.saveButton = null;
    this.textFilter = null;
    this.titleElement = null;
    this.loadMoreBtn = null;

    this.handleAddGroup = null;
    this.handleRemoveGroup = null;
    this.handleSave = null;
    this.handleLoadMore = null;
    this.debouncedHandleFilter = null;
  }

  render(teacherSnapshot) {
    if (!this.containerElement) {
      this.containerElement = document.getElementById('component');
    }

    this.pageElement = document.createElement('div');
    this.pageElement.innerHTML = this.template;

    this.titleElement = this.pageElement.querySelector('[data-title]');
    this.teacherGroupsTable = this.pageElement.querySelector('[data-teacher-groups]');
    this.groupsTable = this.pageElement.querySelector('[data-all-groups]');
    this.saveButton = this.pageElement.querySelector("[data-action='save']");
    this.textFilter = this.pageElement.querySelector('[data-text-filter]');
    this.loadMoreBtn = this.pageElement.querySelector("[data-action='loadMore']");

    this.titleElement.textContent = `Группы учителя ${teacherSnapshot.last_name} ${teacherSnapshot.first_name}`;
    this.containerElement.append(this.pageElement);
  }

  renderTeacherGroupRow(groupData) {
    return `
      <tr class="table__row" data-group-id="${groupData.id}">
          <td class="table__col table__id-col" data-label="ID">${groupData.id}</td>
          <td class="table__col table__small-col" data-label="Группа">${groupData.group_number}</td>
          <td class="table__col table__medium-col" data-label="Курс">${groupData.course?.title ?? "Отсутствует"}</td>
          <td class="table__col table__small-col" data-label="Действия">
              <button class="btn btn-danger" data-action="removeGroup">Снять</button>
          </td>
      </tr>
    `;
  }

  renderAvailableGroupRow(groupData) {
    return `
      <tr class="table__row" data-group-id="${groupData.id}">
          <td class="table__col table__id-col" data-label="ID">${groupData.id}</td>
          <td class="table__col table__small-col" data-label="Группа">${groupData.group_number}</td>
          <td class="table__col table__medium-col" data-label="Курс">${groupData.course?.title ?? "Отсутствует"}</td>
          <td class="table__col table__medium-col" data-label="ID текущего учителя">${groupData?.teacher_id ?? "Отсутствует"}</td>
          <td class="table__col table__small-col" data-label="Действия">
              <button class="btn btn-primary" data-action="addGroup">Назначить</button>
          </td>
      </tr>
    `;
  }

  renderTeacherGroups(groups) {
    const tbody = this.teacherGroupsTable.querySelector('tbody');
    tbody.innerHTML = groups.reduce((html, group) => html + this.renderTeacherGroupRow(group), '');
  }

  renderGroupsTable(groups) {
    const tbody = this.groupsTable.querySelector('tbody');
    tbody.innerHTML = groups.reduce((html, group) => html + this.renderAvailableGroupRow(group), '');
  }

  bindHandlers({ handleAddGroup, handleRemoveGroup, handleSave, handleFilter, handleLoadMore }) {
    this.handleAddGroup = handleAddGroup;
    this.handleRemoveGroup = handleRemoveGroup;
    this.handleSave = handleSave;
    this.handleLoadMore = handleLoadMore;
    this.debouncedHandleFilter = debounce(handleFilter, 400);
  }

  handleEvents() {
    this.teacherGroupsTable.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action !== 'removeGroup') return;

      const groupId = event.target.closest('[data-group-id]')?.dataset.groupId;
      this.handleRemoveGroup(groupId);
    });

    this.groupsTable.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action !== 'addGroup') return;

      const groupId = event.target.closest('[data-group-id]')?.dataset.groupId;
      this.handleAddGroup(groupId);
    });

    this.saveButton.addEventListener('click', async () => this.handleSave());

    this.textFilter.addEventListener('input', async (event) => {
      await this.debouncedHandleFilter(event.target.value);
    });

    this.loadMoreBtn.addEventListener("click", async () => {
      await this.handleLoadMore();
    });
  }

  toggleSaveButton(isChanged) {
    this.saveButton.disabled = !isChanged;
  }

  destroy() {
    if (this.pageElement) this.pageElement.remove();
  }
}
