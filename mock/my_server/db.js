export const counters = {
  teachers: 2,
  students: 3,
  groups: 2,
  courses: 2
};

export function nextId(entity) {
  return counters[entity]++;
}

export const db = {
  teachers: [
    {
      id: 1,
      login: "teacher",
      password: "teacher123",
      phone: "+79990000001",
      first_name: "Иван",
      last_name: "Петров",
      age: 30,
      is_ovz: false,
    },
  ],
  students: [
    {
      id: 1,
      first_name: "Анна",
      last_name: "Смирнова",
      phone: "+79990000002",
      birth_date: null,
    },
    {
      id: 2,
      first_name: "Дмитрий",
      last_name: "Ковалев",
      phone: "+79990000003",
      birth_date: null,
    },
  ],
  groups: [{ id: 1, group_number: "101", course_id: 1, teacher_id: 1, student_ids: [1, 2] }],
  courses: [{ id: 1, title: "Математика", description: "Базовый курс математики" }],
};
