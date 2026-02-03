export const GroupRow = (group) => {
  const students = group.students.map(student => {
    return `<a href="/admin/students/${student.id}" data-spa-link>
              ${student.last_name} ${student.first_name}
            </a>`
  }).join(",");

  return `
    <tr class="table__row" data-group-id="${group.id}">
      <td class="table__col table__id-col" data-label="ID">${group.id}</td>
      <td class="table__col table__small-col" data-label="Номер группы">${group.group_number}</td>
      <td class="table__col table__large-col" data-label="Студенты">${students ? students : "Нет студентов"}</td>
      <td class="table__col table__small-col" data-label="Действия">
        <div class="table__actions">
          <a href="/admin/groups/update/${group.id}" class="table__action-btn" data-action="update" data-spa-link title="Редактировать">
            ✏️
          </a>
          <button class="table__action-btn table__action-btn--danger" data-action="delete" title="Удалить">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `;
};