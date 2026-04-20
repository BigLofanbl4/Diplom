# API Contract: Groups

Все запросы требуют авторизации: `Authorization: Bearer <access_token>`.

Базовый префикс API: `/api/v1`.
В таблице ниже пути указаны относительно префикса.

## `GET /groups`

- Query params:
  - `limit` (default `50`)
  - `offset` (default `0`)
  - `search` (optional)
- `200 OK`:

```json
{
  "data": [
    {
      "id": 1,
      "group_number": "A-1",
      "teacher_id": 3,
      "course_id": 7,
      "course": {
        "id": 7,
        "title": "Math"
      },
      "students_count": 12
    }
  ],
  "meta": {
    "totals": 1,
    "limit": 50,
    "offset": 0,
    "search": null
  }
}
```

## `GET /groups/{id}`

- `200 OK`:

```json
{
  "id": 1,
  "group_number": "A-1",
  "teacher_id": 3,
  "course_id": 7,
  "student_ids": [11, 12],
  "teacher": {
    "id": 3,
    "first_name": "Anna",
    "last_name": "Smirnova"
  },
  "course": {
    "id": 7,
    "title": "Math"
  },
  "students": [
    {
      "id": 11,
      "first_name": "Ivan",
      "last_name": "Petrov"
    }
  ]
}
```

- `404 Not Found`:

```json
{
  "detail": "Group not found"
}
```

## `POST /groups`

- Body (`application/json`):

```json
{
  "group_number": "A-1",
  "teacher_id": 3,
  "student_ids": [11, 12],
  "course_id": 7
}
```

Поля `teacher_id`, `student_ids`, `course_id` опциональны.

- `201 Created`: созданная группа (формат как `GET /groups/{id}`).
- `400 Bad Request`:

```json
{
  "detail": "Validation error"
}
```

## `PATCH /groups/{id}`

- Body: те же поля, что в `POST /groups`, все опциональны.

- `200 OK`: обновлённая группа.
- `404 Not Found`:

```json
{
  "detail": "Group not found"
}
```

## `DELETE /groups/{id}`

- `204 No Content` (без тела)
- `404 Not Found`:

```json
{
  "detail": "Group not found"
}
```

## Notes

- `course_id` у группы может быть `null`.
- При удалении курса связанные группы не удаляются, у них `course_id` становится `null`.
