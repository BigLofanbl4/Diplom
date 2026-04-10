# API Contract: Courses

Все запросы требуют авторизации: `Authorization: Bearer <access_token>`.

Базовый префикс API: `/api/v1`.
В таблице ниже пути указаны относительно префикса.

## Course object

```json
{
  "id": 1,
  "title": "Python Basics",
  "description": "string | null"
}
```

## Endpoints

### `GET /courses`

- Назначение: получить список курсов текущей организации пользователя.
- Body: отсутствует.
- `200 OK`:

```json
[
  {
    "id": 1,
    "title": "Python Basics",
    "description": "Intro"
  }
]
```

### `GET /courses/{id}`

- Назначение: получить курс по `id` с модулями и уроками.
- Body: отсутствует.
- `200 OK`:

```json
{
  "id": 1,
  "title": "Python Basics",
  "description": "Intro",
  "modules": [
    {
      "id": 10,
      "title": "Module 1",
      "module_number": 1,
      "course_id": 1
    }
  ],
  "lessons": [
    {
      "id": 100,
      "title": "Lesson 1",
      "lesson_number": 1,
      "description": "Topic",
      "course_id": 1,
      "module_id": 10
    }
  ]
}
```

- `404 Not Found`:

```json
{
  "detail": "Course not found"
}
```

### `POST /courses`

- Назначение: создать курс в организации текущего пользователя.
- Body (`application/json`):

```json
{
  "title": "Python Basics",
  "description": "Intro"
}
```

`description` опционально.

- `201 Created`:

```json
{
  "id": 1,
  "title": "Python Basics",
  "description": "Intro"
}
```

- `400 Bad Request`:

```json
{
  "detail": "Validation error"
}
```

### `PATCH /courses/{id}`

- Назначение: частично обновить курс (whitelist: `title`, `description`).
- Body (`application/json`):

```json
{
  "title": "Python Basics Updated",
  "description": "New description"
}
```

Оба поля опциональны, но должно быть передано хотя бы одно.

- `200 OK`:

```json
{
  "id": 1,
  "title": "Python Basics Updated",
  "description": "New description"
}
```

- `404 Not Found`:

```json
{
  "detail": "Course not found"
}
```

### `DELETE /courses/{id}`

- Назначение: удалить курс по `id`.
- Body: отсутствует.
- `204 No Content`: без тела.
- `404 Not Found`:

```json
{
  "detail": "Course not found"
}
```

## Nested Modules

### `GET /courses/{course_id}/modules`

- Назначение: список модулей курса.
- `200 OK`:

```json
[
  {
    "id": 1,
    "title": "Module 1",
    "module_number": 1,
    "course_id": 1
  }
]
```

- `404 Not Found`:

```json
{
  "detail": "Course not found"
}
```

### `GET /courses/{course_id}/modules/{module_id}`

- Назначение: получить модуль курса по `module_id`.
- `200 OK`: объект модуля.
- `404 Not Found`:

```json
{
  "detail": "Module not found"
}
```

### `POST /courses/{course_id}/modules`

- Body (`application/json`):

```json
{
  "title": "Module 2",
  "module_number": 2
}
```

- `201 Created`: созданный модуль.
- `400 Bad Request`:

```json
{
  "detail": "Validation error"
}
```

- `404 Not Found`:

```json
{
  "detail": "Course not found"
}
```

### `PATCH /courses/{course_id}/modules/{module_id}`

- Body (`application/json`, whitelist): `title?`, `module_number?`.
- `200 OK`: обновлённый модуль.
- `404 Not Found`: `Course not found` или `Module not found`.
- `422 Unprocessable Entity`: если не передано ни одного поля.

### `DELETE /courses/{course_id}/modules/{module_id}`

- `204 No Content`
- `404 Not Found`: `Course not found` или `Module not found`.

## Nested Lessons

`course_id` берётся только из URL.

### `GET /courses/{course_id}/lessons`

- `200 OK`:

```json
[
  {
    "id": 10,
    "title": "Lesson 1",
    "lesson_number": 1,
    "description": "Intro",
    "course_id": 1,
    "module_id": 1,
    "test_id": null,
    "materials": [
      {
        "id": 5,
        "name": "intro.pdf",
        "size": 12345,
        "url": "/api/v1/courses/1/lessons/10/materials/intro.pdf"
      }
    ]
  }
]
```

- `404 Not Found`:

```json
{
  "detail": "Course not found"
}
```

### `GET /courses/{course_id}/lessons/{lesson_id}`

- `200 OK`: объект урока (тот же формат, что выше).
- `404 Not Found`: `Course not found` или `Lesson not found`.

### `POST /courses/{course_id}/lessons`

- Body: `multipart/form-data`
- Поля:
- `title` (required)
- `lesson_number` (required)
- `description` (optional)
- `homework_text` (optional)
- `module_id` (optional)
- `materials` (optional, repeated file field)

- `201 Created`: созданный урок.
- `400 Bad Request`:

```json
{
  "detail": "Validation error"
}
```

- `404 Not Found`:

```json
{
  "detail": "Course not found"
}
```

### `PATCH /courses/{course_id}/lessons/{lesson_id}`

- Body: `multipart/form-data`
- Поддерживаемые поля:
- `title`, `lesson_number`, `description`, `homework_text`, `module_id`
- `materials` (добавить файлы)
- `removed_material_ids` (удалить файлы, можно CSV или повторяющиеся поля)

- `200 OK`: обновлённый урок.
- `404 Not Found`: `Course not found` или `Lesson not found`.
- `422 Unprocessable Entity`: если не передано ни одного поля.

### `DELETE /courses/{course_id}/lessons/{lesson_id}`

- `204 No Content`
- `404 Not Found`: `Course not found` или `Lesson not found`.

### Notes

- В выдаче урока `test_id` равен `null`, если тест к уроку не привязан.
- `materials` в уроке это метаданные файлов: `[{ id, name, size, url }]`.
- Реального хранения файлов на диске в этом API-контракте нет.

## Common errors

- `401 Unauthorized`:

```json
{
  "detail": "Not authenticated"
}
```

- `403 Forbidden`:

```json
{
  "detail": "Not enough permissions"
}
```
