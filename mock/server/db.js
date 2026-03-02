export const counters = {
  users: 5,
  admins: 2,
  teachers: 2,
  students: 3,
  groups: 2,
  courses: 2,
  modules: 2,
  lessons: 2,
  materials: 2,
  tests: 2,
  questions: 2,
};

export function nextId(entity) {
  return counters[entity]++;
}

export const db = {
  users: [
    {
      id: 1,
      login: "admin1",
      password: "123",
      role: "admin",
    },
    {
      id: 2,
      login: "teacher",
      password: "teacher123",
      role: "teacher",
    },
    {
      id: 3,
      login: "anna",
      password: "anna123",
      role: "student",
    },
    {
      id: 4,
      login: "dima",
      password: "dima123",
      role: "student",
    }

  ],
  admins: [
    {
      id: 1,
      user_id: 1,
      first_name: "Владислав",
      last_name: "Плугатырев",
      role: "admin"
    }
  ],
  teachers: [
    {
      id: 1,
      user_id: 2,
      phone: "+79990000001",
      first_name: "Иван",
      last_name: "Петров",
      age: 30,
      is_ovz: false,
      birth_date: null,
      organization_id: null,
    },
  ],
  students: [
    {
      id: 1,
      user_id: 3,
      first_name: "Анна",
      last_name: "Смирнова",
      phone: "+79990000002",
      birth_date: null,
    },
    {
      id: 2,
      user_id: 4,
      first_name: "Дмитрий",
      last_name: "Ковалев",
      phone: "+79990000003",
      birth_date: null,
    },
  ],
  groups: [{ id: 1, group_number: "101", course_id: 1, teacher_id: 1, student_ids: [1, 2] }],
  courses: [{ id: 1, title: "Математика", description: "Базовый курс математики" }],
  modules: [{ id: 1, title: "Алгебра", module_number: 1, course_id: 1 }],
  lessons: [
    {
      id: 1,
      title: "Линейные уравнения",
      lesson_number: 1,
      description: "Решение линейных уравнений",
      course_id: 1,
      module_id: 1,
      test_id: 1,
      homework_text: null,
    },
  ],
  materials: [
    {
      id: 1,
      name: "homework-1.pdf",
      size: 14000,
      url: null,
      course_id: 1,
      lesson_id: 1
    },
  ],
  tests: [
    {
      id: 1,
      lesson_id: 1,
      course_id: 1,
      title: "Тест 1",
      questions_number: 1
    }
  ],
  questions: [
    {
      id: 1,
      test_id: 1,
      number: 1,
      answer: ["Ответ на вопрос 1"],
      text: "Вопрос 1",
      type: "text",
      options: null,
    }
  ],
};
