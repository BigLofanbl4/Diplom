# API Contract: Students

Все запросы требуют авторизации: `Authorization: Bearer <access_token>`.

Базовый префикс API: `/api/v1`.
В таблице ниже пути указаны относительно префикса.

## Endpoints

### `GET /students`

- Назначение: получить список студентов текущей организации.
- Body: отсутствует.
- `200 OK`:

```json
[
  {
    "id": 1,
    "first_name": "Ivan",
    "last_name": "Petrov",
    "phone": "+79990000000",
    "birth_date": "2012-04-17",
    "login": "student_login",
    "groups_count": 2
  }
]
```

### `GET /students/{id}`

- Назначение: получить студента по `id`.
- Body: отсутствует.
- `200 OK`:

```json
{
  "id": 1,
  "first_name": "Ivan",
  "last_name": "Petrov",
  "phone": "+79990000000",
  "birth_date": "2012-04-17",
  "login": "student_login",
  "group_ids": [3, 5],
  "groups": [
    {
      "id": 3,
      "group_number": "A-1"
    },
    {
      "id": 5,
      "group_number": "A-2"
    }
  ]
}
```

- `404 Not Found`:

```json
{
  "detail": "Student not found"
}
```

### `POST /students`

- Назначение: создать студента.
- Body (`application/json`):

```json
{
  "first_name": "Ivan",
  "last_name": "Petrov",
  "login": "student_login",
  "password": "strong_password",
  "phone": "+79990000000",
  "birth_date": "2012-04-17",
  "group_ids": [3, 5]
}
```

Поля `phone`, `birth_date`, `group_ids` опциональны (`group_ids` по умолчанию `[]`).

- `201 Created`: созданный студент (тот же формат, что `GET /students/{id}`).
- `400 Bad Request`:

```json
{
  "detail": "Validation error"
}
```

### `PATCH /students/{id}`

- Назначение: частично обновить студента.
- Body: те же поля, что в `POST /students`, все опциональны.

- `200 OK`: обновлённый студент (тот же формат, что `GET /students/{id}`).
- `404 Not Found`:

```json
{
  "detail": "Student not found"
}
```

### `DELETE /students/{id}`

- Назначение: удалить студента.
- Body: отсутствует.
- `204 No Content`: без тела.
- `404 Not Found`:

```json
{
  "detail": "Student not found"
}
```

## Common errors

- `401 Unauthorized`:

```json
{
  "detail": "Not authenticated"
}
```

- `422 Unprocessable Entity`: стандартная ошибка валидации FastAPI.
