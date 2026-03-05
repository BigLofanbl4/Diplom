export const GroupRow = (group) => {
  const students = Array.isArray(group.students)
    ? group.students.map(student => `
      <a href="/admin/students/${student.id}" data-spa-link>
        ${student.last_name} ${student.first_name}
      </a>`
    ).join(",")
    : null;
  const studentsLabel = students || `${group.students_count ?? 0} студентов`;

  const teacher = group?.teacher ? `
    <a href="/admin/teachers/${group.teacher.id}" data-spa-link>
        ${group.teacher.first_name} ${group.teacher.last_name}
    </a>
  ` : (group.teacher_id ? `ID: ${group.teacher_id}` : "Преподаватель не назначен");

  return `
    <tr class="table__row" data-group-id="${group.id}">
      <td class="table__col table__id-col" data-label="ID">${group.id}</td>
      <td class="table__col table__small-col" data-label="Номер группы">${group.group_number}</td>
      <td class="table__col table__large-col" data-label="Студенты">${studentsLabel}</td>
       <td class="table__col table__small-col" data-label="Преподаватель">${teacher}</td>
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
