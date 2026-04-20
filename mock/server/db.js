export const counters = {
  users: 5,
  admins: 2,
  teachers: 2,
  students: 3,
  groups: 3,
  courses: 4,
  modules: 6,
  lessons: 5,
  materials: 4,
  tests: 3,
  questions: 3,
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
      course_ids: [1, 3],
      schedule_preferences: [
        {
          id: "slot-1",
          day: "monday",
          start: "10:00",
          end: "12:00",
        },
        {
          id: "slot-2",
          day: "wednesday",
          start: "14:00",
          end: "17:00",
        },
      ],
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
  groups: [
    { id: 1, group_number: "101", course_id: 1, teacher_id: 1, student_ids: [1, 2] },
    { id: 2, group_number: "102", course_id: 1, teacher_id: 1, student_ids: [1] },
  ],
  courses: [
    {
      id: 1,
      title: "Математика",
      description: "Шаблон базового курса математики для учебных групп",
      kind: "template",
      template_course_id: null,
      group_id: null,
      teacher_id: null,
      max_modules_count: 4,
    },
    {
      id: 2,
      title: "Математика · Группа 101",
      description: "Экземпляр курса для группы 101",
      kind: "instance",
      template_course_id: 1,
      group_id: 1,
      teacher_id: 1,
      max_modules_count: 4,
    },
    {
      id: 3,
      title: "Физика",
      description: "Шаблон базового курса физики для учебных групп",
      kind: "template",
      template_course_id: null,
      group_id: null,
      teacher_id: null,
      max_modules_count: 3,
    },
  ],
  modules: [
    { id: 1, title: "Алгебра", module_number: 1, course_id: 1 },
    { id: 2, title: "Геометрия", module_number: 2, course_id: 1 },
    { id: 3, title: "Тригонометрия", module_number: 3, course_id: 1 },
    { id: 4, title: "Повторение", module_number: 4, course_id: 1 },
    { id: 5, title: "Алгебра", module_number: 1, course_id: 2 },
  ],
  lessons: [
    {
      id: 1,
      title: "Линейные уравнения",
      lesson_number: 1,
      description: "Решение линейных уравнений",
      course_id: 1,
      module_id: 1,
      test_id: 1,
      homework_text: "Решить 10 уравнений из раздаточного материала.",
    },
    {
      id: 2,
      title: "Квадратные уравнения",
      lesson_number: 2,
      description: "Формулы, дискриминант и базовые задачи",
      course_id: 1,
      module_id: 1,
      test_id: null,
      homework_text: "Подготовить краткий конспект и решить 5 задач.",
    },
    {
      id: 3,
      title: "Треугольники и их свойства",
      lesson_number: 1,
      description: "Введение в геометрию треугольников",
      course_id: 1,
      module_id: 2,
      test_id: null,
      homework_text: "Повторить признаки равенства треугольников.",
    },
    {
      id: 4,
      title: "Линейные уравнения",
      lesson_number: 1,
      description: "Решение линейных уравнений",
      course_id: 2,
      module_id: 5,
      test_id: 2,
      homework_text: "Решить 10 уравнений из раздаточного материала.",
    },
  ],
  materials: [
    {
      id: 1,
      name: "linear-equations.pdf",
      size: 14000,
      url: null,
      course_id: 1,
      lesson_id: 1
    },
    {
      id: 2,
      name: "quadratic-equations.pdf",
      size: 18500,
      url: null,
      course_id: 1,
      lesson_id: 2
    },
    {
      id: 3,
      name: "linear-equations-group-101.pdf",
      size: 14000,
      url: null,
      course_id: 2,
      lesson_id: 4
    },
  ],
  tests: [
    {
      id: 1,
      lesson_id: 1,
      course_id: 1,
      title: "Тест 1",
      questions_number: 1
    },
    {
      id: 2,
      lesson_id: 4,
      course_id: 2,
      title: "Тест 1",
      questions_number: 1
    },
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
    },
    {
      id: 2,
      test_id: 2,
      number: 1,
      answer: ["Ответ на вопрос 1"],
      text: "Вопрос 1",
      type: "text",
      options: null,
    },
  ],
};
