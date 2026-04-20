# Teacher Mock Endpoints

Ниже перечислены новые mock-endpoints, добавленные для teacher-функционала.

## 1. Получить свои группы

- Method: `GET`
- URL: `/api/v1/teachers/me/groups`
- Auth: требуется Bearer token пользователя с ролью `teacher`
- Response:

```json
{
  "data": [
    {
      "id": 1,
      "group_number": "101",
      "student_ids": [1, 2],
      "students_count": 2,
      "course_template": {
        "id": 1,
        "title": "Математика",
        "description": "Шаблон базового курса математики для учебных групп",
        "kind": "template",
        "template_course_id": null,
        "group_id": null,
        "teacher_id": null,
        "max_modules_count": 4
      },
      "course_instance": {
        "id": 2,
        "title": "Математика · Группа 101",
        "description": "Экземпляр курса для группы 101",
        "kind": "instance",
        "template_course_id": 1,
        "group_id": 1,
        "teacher_id": 1,
        "max_modules_count": 4
      },
      "has_course_instance": true
    }
  ]
}
```

## 2. Получить страницу конкретной группы преподавателя

- Method: `GET`
- URL: `/api/v1/teachers/me/groups/:groupId`
- Auth: требуется Bearer token пользователя с ролью `teacher`
- Behavior:
  - возвращает только группы, назначенные текущему преподавателю;
  - если у группы есть шаблон курса, но ещё нет курса группы, он создаётся автоматически;
  - внутри ответа приходит полный `course_instance` c модулями и уроками;
  - каждый урок дополнительно содержит сводку по ДЗ и тестам группы.
- Response:

```json
{
  "id": 1,
  "group_number": "101",
  "students_count": 2,
  "students": [
    {
      "id": 1,
      "first_name": "Анна",
      "last_name": "Смирнова"
    }
  ],
  "course_template": {
    "id": 1,
    "title": "Математика",
    "max_modules_count": 4
  },
  "course_instance": {
    "id": 2,
    "title": "Математика · Группа 101",
    "kind": "instance",
    "template_course": {
      "id": 1,
      "title": "Математика",
      "max_modules_count": 4
    },
    "modules": [],
    "lessons": [
      {
        "id": 4,
        "lesson_number": 1,
        "homework_review": {
          "total_students": 2,
          "submitted_count": 1,
          "checked_count": 0,
          "approved_count": 0,
          "needs_revision_count": 0,
          "pending_count": 1
        },
        "test_review": {
          "total_students": 2,
          "attempted_count": 2,
          "passed_count": 1,
          "failed_count": 1
        }
      }
    ]
  }
}
```

## 3. Получить сдачи ДЗ по уроку своей группы

- Method: `GET`
- URL: `/api/v1/teachers/me/groups/:groupId/lessons/:lessonId/homework-submissions`
- Auth: требуется Bearer token пользователя с ролью `teacher`
- Behavior:
  - возвращает только уроки и отправки, относящиеся к группам текущего преподавателя;
  - для каждого ученика группы приходит либо последняя отправка, либо `null`, если ученик еще ничего не отправлял.
- Response:

```json
{
  "lesson": {
    "id": 4,
    "title": "Линейные уравнения",
    "lesson_number": 1
  },
  "stats": {
    "total_students": 2,
    "submitted_count": 1,
    "checked_count": 0,
    "approved_count": 0,
    "needs_revision_count": 0,
    "pending_count": 1
  },
  "data": [
    {
      "student": {
        "id": 1,
        "first_name": "Анна",
        "last_name": "Смирнова"
      },
      "submission": {
        "id": 1,
        "text": "Решил задания в тетради, прикладываю фото.",
        "status": "pending",
        "feedback": "",
        "checked_at": null,
        "files": [
          {
            "id": 1,
            "name": "homework-answer-anna.pdf"
          }
        ]
      }
    },
    {
      "student": {
        "id": 2,
        "first_name": "Дмитрий",
        "last_name": "Ковалев"
      },
      "submission": null
    }
  ]
}
```

## 4. Проверить ДЗ ученика

- Method: `PATCH`
- URL: `/api/v1/teachers/me/groups/:groupId/lessons/:lessonId/homework-submissions/:submissionId`
- Auth: требуется Bearer token пользователя с ролью `teacher`
- Request body:

```json
{
  "status": "approved",
  "feedback": "Все верно, можно переходить дальше."
}
```

- Допустимые статусы:
  - `pending`
  - `approved`
  - `needs_revision`
- Behavior:
  - обновляет статус и комментарий преподавателя;
  - если статус не `pending`, сервер записывает `checked_at` и `checked_by`;
  - если ученик пересылает ДЗ заново, статус автоматически сбрасывается в `pending`.

## 5. Получить результаты тестов по уроку своей группы

- Method: `GET`
- URL: `/api/v1/teachers/me/groups/:groupId/lessons/:lessonId/test-attempts`
- Auth: требуется Bearer token пользователя с ролью `teacher`
- Behavior:
  - возвращает только учеников группы текущего преподавателя;
  - для каждого ученика приходит последняя попытка или `null`;
  - поле `is_passed` вычисляется на моке как `score >= total`.
- Response:

```json
{
  "lesson": {
    "id": 4,
    "title": "Линейные уравнения",
    "lesson_number": 1
  },
  "stats": {
    "total_students": 2,
    "attempted_count": 2,
    "passed_count": 1,
    "failed_count": 1
  },
  "data": [
    {
      "student": {
        "id": 1,
        "first_name": "Анна",
        "last_name": "Смирнова"
      },
      "attempt": {
        "id": 1,
        "score": 1,
        "total": 1,
        "is_passed": true
      }
    }
  ]
}
```

## 6. Получить заготовку предметов и расписания преподавателя

- Method: `GET`
- URL: `/api/v1/teachers/me/preferences`
- Auth: требуется Bearer token пользователя с ролью `teacher`
- Response:

```json
{
  "teacher_id": 1,
  "course_ids": [1, 3],
  "schedule_preferences": [
    {
      "id": "slot-1",
      "day": "monday",
      "start": "10:00",
      "end": "12:00"
    }
  ],
  "available_courses": [
    {
      "id": 1,
      "title": "Математика",
      "selected": true
    }
  ]
}
```

## 7. Обновить предметы и расписание преподавателя

- Method: `PUT`
- URL: `/api/v1/teachers/me/preferences`
- Auth: требуется Bearer token пользователя с ролью `teacher`
- Request body:

```json
{
  "course_ids": [1, 3],
  "schedule_preferences": [
    {
      "id": "slot-a",
      "day": "tuesday",
      "start": "09:00",
      "end": "11:00"
    },
    {
      "day": "friday",
      "start": "13:00",
      "end": "16:00"
    }
  ]
}
```

- Behavior:
  - сохраняет выбранные предметы;
  - сохраняет только валидные временные слоты с `day`, `start`, `end`;
  - если у слота нет `id`, сервер генерирует его сам.

## Обновлённое поведение существующих endpoints

Эти endpoints уже были в проекте, но теперь поддерживают teacher-сценарий через отдельный курс группы:

- `POST /api/v1/courses/:course_id/modules`
  - если `course_id` относится к курсу группы, модуль можно создать только в пределах шаблона;
  - номер модуля проверяется по шаблону;
  - заголовок модуля копируется из соответствующего шаблонного модуля.

- `POST /api/v1/courses/:course_id/lessons`
  - если `course_id` относится к курсу группы и в шаблоне найден урок с таким `module_number + lesson_number`, автоматически копируются:
    - базовые поля урока;
    - материалы;
    - тест;
    - вопросы теста;
    - домашнее задание.
  - если шаблонного урока нет, создаётся пустой урок в курсе группы, который преподаватель заполняет сам.

- `PATCH /api/v1/courses/:course_id/modules/:module_id`
  - изменения сохраняются только в курсе группы и не затрагивают шаблон.

- `PATCH /api/v1/courses/:course_id/lessons/:lesson_id`
  - изменения сохраняются только в курсе группы и не затрагивают шаблон.
