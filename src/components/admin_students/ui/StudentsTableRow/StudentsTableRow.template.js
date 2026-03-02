export const StudentRow = (student) => {
  const groups = student.groups.map(group => {
    return `<a href="/admin/groups/${group.id}">${group.group_number}</a>`
  }).join(", ");
  const fullName = `${student.last_name} ${student.first_name}`;
  return `
    <tr class="table__row" data-student-id="${student.id}">
      <td class="table__col table__id-col" data-label="ID">${student.id}</td>
      <td class="table__col table__small-col" data-label="ФИО">${fullName}</td>
      <td class="table__col table__medium-col" data-label="Телефон">${student.phone}</td>
      <td class="table__col table__medium-col" data-label="Логин">${student.login}</td>
      <td class="table__col table__large-col" data-label="Группы">${groups ? groups : "Нет групп"}</td>
      <td class="table__col table__small-col" data-label="Действия">
        <div class="table__actions">
          <a href="/admin/students/update/${student.id}" class="table__action-btn" data-action="update" data-spa-link title="Редактировать">
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