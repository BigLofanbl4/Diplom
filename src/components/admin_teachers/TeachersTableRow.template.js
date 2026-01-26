export const TeacherRow = (teacher) => {
  const ovz = teacher.is_ovz 
    ? `<span class="table__badge table__badge--success">Да</span>` 
    : `<span class="table__badge table__badge--warning">Нет</span>`
  const fullName = `${teacher.first_name} ${teacher.last_name}`;
  return `
    <tr class="table__row" data-teacher-id="${teacher.id}">
    <td class="table__col table__id-col" data-label="ID">${teacher.id}</td>
    <td class="table__col table__small-col" data-label="Логин">${teacher.login}</td>
    <td class="table__col table__medium-col" data-label="Организация">Заглушка</td>
    <td class="table__col table__medium-col" data-label="Телефон">${teacher.phone}</td>
    <td class="table__col table__large-col" data-label="ФИО">${fullName}</td>
    <td class="table__col table__small-col" data-label="Возраст">${teacher.age}</td>
    <td class="table__col table__small-col" data-label="ОВЗ">${ovz}</td>
    <td class="table__col table__small-col" data-label="Действия">
      <div class="table__actions">
        <a href="/admin/teachers/update/${teacher.id}" class="table__action-btn" data-action="update" data-spa-link title="Редактировать">
          ✏️
        </a>
        <button class="table__action-btn table__action-btn--danger" data-action="delete" title="Удалить">
          🗑️
        </button>
      </div>
    </td>
  </tr>
  `;
}