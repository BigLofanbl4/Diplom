export const ManagerRow = (manager) => {
  const fullName = `${manager.first_name} ${manager.last_name}`;

  return `
    <tr class="table__row" data-manager-id="${manager.id}">
      <td class="table__col table__id-col" data-label="ID">${manager.id}</td>
      <td class="table__col table__small-col" data-label="Логин">${manager.login}</td>
      <td class="table__col table__medium-col" data-label="Телефон">${manager.phone ?? "Не указан"}</td>
      <td class="table__col table__large-col" data-label="ФИО">
        <div class="table__primary">${fullName}</div>
      </td>
      <td class="table__col table__small-col" data-label="Действия">
        <div class="table__actions">
          <a href="/admin/managers/update/${manager.id}" class="table__action-btn" data-spa-link title="Редактировать">
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
