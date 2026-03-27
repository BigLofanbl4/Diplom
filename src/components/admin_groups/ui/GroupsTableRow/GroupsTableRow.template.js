export const GroupRow = (group) => {
  const students = Array.isArray(group.students)
    ? group.students.map(student => `
      <span class="table__chip">
        ${student.last_name} ${student.first_name}
      </span>`
    ).join("")
    : null;
  const studentsLabel = students || `${group.students_count ?? 0} студентов`;

  const teacher = group?.teacher ? `
    <a href="/admin/teachers/${group.teacher.id}/groups" data-spa-link class="table__link-strong">
        ${group.teacher.first_name} ${group.teacher.last_name}
    </a>
  ` : (group.teacher_id ? `ID: ${group.teacher_id}` : "Преподаватель не назначен");

  return `
    <tr class="table__row" data-group-id="${group.id}">
      <td class="table__col table__id-col" data-label="ID">${group.id}</td>
      <td class="table__col table__small-col" data-label="Номер группы">
        <div class="table__primary">${group.group_number}</div>
      </td>
      <td class="table__col table__large-col" data-label="Студенты">
        ${students ? `<div class="table__chip-list">${studentsLabel}</div>` : `<span class="table__muted">${studentsLabel}</span>`}
      </td>
       <td class="table__col table__small-col" data-label="Преподаватель">${teacher}</td>
      <td class="table__col table__small-col" data-label="Действия">
        <div class="table__actions">
          <a
            href="/admin/groups/${group.id}/teacher"
            class="table__action-btn"
            data-spa-link
            title="Назначить преподавателя"
          >
            <i class="fa-solid fa-user-plus"></i>
          </a>
          <a href="/admin/groups/update/${group.id}" class="table__action-btn" data-action="update" data-spa-link title="Редактировать">
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
