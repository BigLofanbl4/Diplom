# Student Mock Endpoints

Ниже перечислены новые mock-endpoints, добавленные для student-функционала.

## 1. Получить свои курсы

- Method: `GET`
- URL: `/api/v1/students/me/courses`
- Auth: требуется Bearer token пользователя с ролью `student`
- Response:

```json
{
  "data": [
    {
      "id": 2,
      "title": "Математика · Группа 101",
      "description": "Экземпляр курса для группы 101",
      "group": {
        "id": 1,
        "group_number": "101"
      },
      "modules_count": 1,
      "lessons_count": 1
    }
  ]
}
```

## 2. Получить страницу курса ученика

- Method: `GET`
- URL: `/api/v1/students/me/courses/:courseId`
- Auth: требуется Bearer token пользователя с ролью `student`
- Behavior:
  - отдаёт только курсы, доступные ученику через его группы;
  - внутри уроков возвращает текущую отправку ДЗ ученика и последнюю попытку теста.

## 3. Получить тест урока для ученика

- Method: `GET`
- URL: `/api/v1/students/me/courses/:courseId/lessons/:lessonId/test`
- Auth: требуется Bearer token пользователя с ролью `student`
- Response:

```json
{
  "id": 2,
  "title": "Тест 1",
  "lesson_id": 4,
  "course_id": 2,
  "questions": [
    {
      "id": 2,
      "number": 1,
      "text": "Вопрос 1",
      "type": "text",
      "answer": ["Ответ на вопрос 1"],
      "options": null
    }
  ],
  "latest_attempt": {
    "id": 1,
    "score": 1,
    "total": 1
  }
}
```

## 4. Отправить попытку теста

- Method: `POST`
- URL: `/api/v1/students/me/courses/:courseId/lessons/:lessonId/test-attempts`
- Auth: требуется Bearer token пользователя с ролью `student`
- Request body:

```json
{
  "answers": {
    "2": "Ответ на вопрос 1"
  }
}
```

- Behavior:
  - создаёт новую попытку;
  - считает результат на моке;
  - для `text` и `single_choice` сравнивает одиночный ответ;
  - для `multiple_choice` сравнивает набор выбранных ответов.

## 5. Отправить ответ на домашнее задание

- Method: `POST`
- URL: `/api/v1/students/me/courses/:courseId/lessons/:lessonId/homework-submission`
- Auth: требуется Bearer token пользователя с ролью `student`
- Content-Type: `multipart/form-data`
- Fields:
  - `text` — текст ответа
  - `files` — один или несколько файлов

- Behavior:
  - создаёт новую отправку ДЗ;
  - если отправка уже существует, обновляет её;
  - возвращает актуальную запись отправки.
