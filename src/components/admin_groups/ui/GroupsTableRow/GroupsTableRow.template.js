import { getPanelPath } from "../../../../utils/panelRoute.js";

function formatSchedule(slots = []) {
  if (!Array.isArray(slots) || slots.length === 0) return "Не задано";

  const dayLabels = {
    monday: "Пн",
    tuesday: "Вт",
    wednesday: "Ср",
    thursday: "Чт",
    friday: "Пт",
    saturday: "Сб",
    sunday: "Вс",
  };

  return slots
    .map((slot) => `${dayLabels[slot.day] ?? slot.day} ${slot.start}-${slot.end}`)
    .join(", ");
}

export const GroupRow = (group) => {
  const students = Array.isArray(group.students)
    ? group.students.map(student => `
      <span class="table__chip">
        ${student.last_name} ${student.first_name}
      </span>`
    ).join("")
    : null;
  const studentsLabel = students || `${group.students_count ?? 0} студентов`;

  const teacher = group?.teacher
    ? `<span class="table__link-strong">${group.teacher.first_name} ${group.teacher.last_name}</span>`
    : (group.teacher_id ? `ID: ${group.teacher_id}` : "Преподаватель не назначен");

  return `
    <tr class="table__row" data-group-id="${group.id}">
      <td class="table__col table__id-col" data-label="ID">${group.id}</td>
      <td class="table__col table__small-col" data-label="Номер группы">
        <div class="table__primary">${group.group_number}</div>
      </td>
      <td class="table__col table__medium-col" data-label="Расписание">
        <span class="table__muted">${formatSchedule(group.planned_schedule_slots)}</span>
      </td>
      <td class="table__col table__small-col" data-label="Старт">${group.planned_start_date ?? "Не задан"}</td>
      <td class="table__col table__large-col" data-label="Студенты">
        ${students ? `<div class="table__chip-list">${studentsLabel}</div>` : `<span class="table__muted">${studentsLabel}</span>`}
      </td>
       <td class="table__col table__small-col" data-label="Преподаватель">${teacher}</td>
      <td class="table__col table__small-col" data-label="Действия">
        <div class="table__actions">
          <a
            href="${getPanelPath(`/groups/${group.id}/teacher`)}"
            class="table__action-btn"
            data-spa-link
            title="Назначить преподавателя"
          >
            <i class="fa-solid fa-user-plus"></i>
          </a>
          <a href="${getPanelPath(`/groups/update/${group.id}`)}" class="table__action-btn" data-action="update" data-spa-link title="Редактировать">
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
