export const StudentRow = (student) => {
  const groups = Array.isArray(student.groups)
    ? student.groups.map(group => `<span class="table__chip">${group.group_number}</span>`).join("")
    : null;
  const groupsLabel = groups || `${student.groups_count ?? 0}`;
  const fullName = `${student.last_name} ${student.first_name}`;
  return `
    <tr class="table__row" data-student-id="${student.id}">
      <td class="table__col table__id-col" data-label="ID">${student.id}</td>
      <td class="table__col table__small-col" data-label="ФИО">
        <div class="table__primary">${fullName}</div>
      </td>
      <td class="table__col table__medium-col" data-label="Телефон">${student.phone}</td>
      <td class="table__col table__medium-col" data-label="Логин">${student.login}</td>
      <td class="table__col table__large-col" data-label="Группы">
        ${groups ? `<div class="table__chip-list">${groupsLabel}</div>` : `<span class="table__muted">${groupsLabel} групп</span>`}
      </td>
      <td class="table__col table__small-col" data-label="Действия">
        <div class="table__actions">
          <a href="/admin/students/update/${student.id}" class="table__action-btn" data-action="update" data-spa-link title="Редактировать">
            <i class="fa-solid fa-pen-to-square"></i>
          </a>
          <button class="table__action-btn table__action-btn--danger" data-action="delete" title="Удалить">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}; 
