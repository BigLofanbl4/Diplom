const WEEKDAY_BY_DAY = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function normalizeTime(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toMinutes(value) {
  const normalized = normalizeTime(value);
  if (!/^\d{2}:\d{2}$/.test(normalized)) return Number.NaN;
  const [hours, minutes] = normalized.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

function normalizeDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function compareDates(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  const normalizedLeftStart = normalizeDate(leftStart);
  const normalizedRightStart = normalizeDate(rightStart);
  if (!normalizedLeftStart || !normalizedRightStart) return true;

  const effectiveLeftEnd = normalizeDate(leftEnd) ?? "9999-12-31";
  const effectiveRightEnd = normalizeDate(rightEnd) ?? "9999-12-31";

  return compareDates(normalizedLeftStart, effectiveRightEnd) <= 0 &&
    compareDates(normalizedRightStart, effectiveLeftEnd) <= 0;
}

function getWeekdayFromDate(date) {
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) return null;

  const utcDate = new Date(`${normalizedDate}T00:00:00Z`);
  if (Number.isNaN(utcDate.getTime())) return null;

  return utcDate.getUTCDay();
}

export function normalizeScheduleSlots(slots = []) {
  if (!Array.isArray(slots)) return [];

  return slots
    .map((slot) => ({
      id: slot?.id || crypto.randomUUID(),
      day: typeof slot?.day === "string" ? slot.day.trim().toLowerCase() : "",
      start: normalizeTime(slot?.start),
      end: normalizeTime(slot?.end),
    }))
    .filter((slot) => {
      const startMinutes = toMinutes(slot.start);
      const endMinutes = toMinutes(slot.end);
      return WEEKDAY_BY_DAY[slot.day] !== undefined &&
        !Number.isNaN(startMinutes) &&
        !Number.isNaN(endMinutes) &&
        startMinutes < endMinutes;
    })
    .sort((left, right) => {
      if (left.day !== right.day) return WEEKDAY_BY_DAY[left.day] - WEEKDAY_BY_DAY[right.day];
      return toMinutes(left.start) - toMinutes(right.start);
    });
}

function scheduleContainsSlot(schedulePreferences = [], requestedSlot) {
  const requestedStart = toMinutes(requestedSlot.start);
  const requestedEnd = toMinutes(requestedSlot.end);

  return schedulePreferences.some((slot) => {
    if (slot.day !== requestedSlot.day) return false;
    const slotStart = toMinutes(slot.start);
    const slotEnd = toMinutes(slot.end);
    if (Number.isNaN(slotStart) || Number.isNaN(slotEnd)) return false;
    return slotStart <= requestedStart && slotEnd >= requestedEnd;
  });
}

function slotsOverlap(left, right) {
  if (left.day !== right.day) return false;

  const leftStart = toMinutes(left.start);
  const leftEnd = toMinutes(left.end);
  const rightStart = toMinutes(right.start);
  const rightEnd = toMinutes(right.end);

  if ([leftStart, leftEnd, rightStart, rightEnd].some(Number.isNaN)) return false;

  return leftStart < rightEnd && rightStart < leftEnd;
}

function getGroupSchedule(groupRecord) {
  return normalizeScheduleSlots(groupRecord?.planned_schedule_slots ?? []);
}

function collectTeacherConflicts({ db, teacherId, requestedSlots, requestedStartDate, requestedEndDate, ignoreGroupId = null }) {
  const conflicts = [];

  db.groups.forEach((groupRecord) => {
    if (groupRecord.id === ignoreGroupId) return;
    if (groupRecord.teacher_id !== teacherId) return;

    const groupSlots = getGroupSchedule(groupRecord);
    if (groupSlots.length === 0) return;

    if (!rangesOverlap(
      groupRecord.planned_start_date,
      groupRecord.planned_end_date,
      requestedStartDate,
      requestedEndDate,
    )) {
      return;
    }

    requestedSlots.forEach((requestedSlot) => {
      groupSlots.forEach((groupSlot) => {
        if (!slotsOverlap(groupSlot, requestedSlot)) return;
        conflicts.push({
          group_id: groupRecord.id,
          group_number: groupRecord.group_number,
          start_date: groupRecord.planned_start_date ?? null,
          end_date: groupRecord.planned_end_date ?? null,
          slot: {
            day: groupSlot.day,
            start: groupSlot.start,
            end: groupSlot.end,
          },
        });
      });
    });
  });

  return conflicts;
}

export function getTeacherAvailabilityForGroup({ db, teacherRecord, groupRecord }) {
  const groupSlots = getGroupSchedule(groupRecord);
  const reasons = [];

  if (!groupRecord) {
    return {
      is_available: true,
      reasons,
      conflicts: [],
    };
  }

  if (!Array.isArray(teacherRecord.course_ids) || !teacherRecord.course_ids.includes(groupRecord.course_id)) {
    reasons.push("Преподаватель не отметил этот курс в предпочтениях.");
  }

  if (!groupRecord.planned_start_date) {
    reasons.push("У группы не указана дата старта.");
  }

  if (groupSlots.length === 0) {
    reasons.push("У группы не заполнены weekly-слоты.");
  }

  const uncoveredSlots = groupSlots.filter((slot) => !scheduleContainsSlot(teacherRecord.schedule_preferences ?? [], slot));
  if (uncoveredSlots.length > 0) {
    reasons.push("Базовая доступность преподавателя не покрывает один или несколько слотов группы.");
  }

  const conflicts = collectTeacherConflicts({
    db,
    teacherId: teacherRecord.id,
    requestedSlots: groupSlots,
    requestedStartDate: groupRecord.planned_start_date,
    requestedEndDate: groupRecord.planned_end_date,
    ignoreGroupId: groupRecord.id,
  });

  if (conflicts.length > 0) {
    reasons.push("Есть пересечение с уже назначенной группой после даты старта.");
  }

  return {
    is_available: reasons.length === 0,
    reasons,
    conflicts,
  };
}

export function getTeacherAvailabilityForReplacement({
  db,
  teacherRecord,
  date,
  start,
  end,
  ignoreGroupId = null,
}) {
  const weekday = getWeekdayFromDate(date);
  if (weekday === null) {
    return {
      is_available: false,
      reasons: ["Не удалось определить день недели для даты замены."],
      conflicts: [],
    };
  }

  const day = Object.keys(WEEKDAY_BY_DAY).find((key) => WEEKDAY_BY_DAY[key] === weekday);
  const requestedSlot = normalizeScheduleSlots([{ day, start, end }])[0];

  if (!requestedSlot) {
    return {
      is_available: false,
      reasons: ["Передан некорректный временной слот замены."],
      conflicts: [],
    };
  }

  const reasons = [];

  if (!scheduleContainsSlot(teacherRecord.schedule_preferences ?? [], requestedSlot)) {
    reasons.push("Слот замены не входит в weekly-доступность преподавателя.");
  }

  const conflicts = db.groups
    .filter((groupRecord) => groupRecord.id !== ignoreGroupId)
    .filter((groupRecord) => groupRecord.teacher_id === teacherRecord.id)
    .filter((groupRecord) => {
      const startDate = normalizeDate(groupRecord.planned_start_date);
      const endDate = normalizeDate(groupRecord.planned_end_date);
      if (!startDate) return false;
      if (compareDates(startDate, date) > 0) return false;
      if (endDate && compareDates(endDate, date) < 0) return false;
      return getGroupSchedule(groupRecord).some((slot) => slotsOverlap(slot, requestedSlot));
    })
    .map((groupRecord) => ({
      group_id: groupRecord.id,
      group_number: groupRecord.group_number,
      start_date: groupRecord.planned_start_date ?? null,
      end_date: groupRecord.planned_end_date ?? null,
    }));

  if (conflicts.length > 0) {
    reasons.push("На эту конкретную дату слот уже занят другой группой.");
  }

  return {
    is_available: reasons.length === 0,
    reasons,
    conflicts,
  };
}
