# API Contract: Teachers

Все запросы требуют авторизации: `Authorization: Bearer <access_token>`.

Базовый префикс API: `/api/v1`.
В таблице ниже пути указаны относительно префикса.

## `GET /teachers`

- Query params:
  - `limit` (default `50`)
  - `offset` (default `0`)
  - `search` (optional)
- `200 OK`:

```json
{
  "data": [
    {
      "id": 3,
      "login": "teacher_login",
      "phone": "+79990000000",
      "first_name": "Anna",
      "last_name": "Smirnova",
      "age": 29,
      "is_ovz": false,
      "organization_id": 1,
      "groups_count": 2
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

## `GET /teachers/{id}`

- `200 OK`:

```json
{
  "id": 3,
  "first_name": "Anna",
  "last_name": "Smirnova",
  "phone": "+79990000000",
  "age": 29,
  "birth_date": "1996-01-20",
  "is_ovz": false,
  "organization_id": 1,
  "login": "teacher_login",
  "group_ids": [1, 2],
  "groups": [
    {
      "id": 1,
      "group_number": "A-1"
    }
  ]
}
```

- `404 Not Found`:

```json
{
  "detail": "Teacher not found"
}
```

## `POST /teachers`

- Body (`application/json`):

```json
{
  "first_name": "Anna",
  "last_name": "Smirnova",
  "login": "teacher_login",
  "password": "strong_password",
  "phone": "+79990000000",
  "age": 29,
  "birth_date": "1996-01-20",
  "is_ovz": false,
  "organization_id": 1,
  "group_ids": [1, 2]
}
```

Поля `phone`, `age`, `birth_date`, `is_ovz`, `organization_id`, `group_ids` опциональны.

- `201 Created`: созданный учитель (формат как `GET /teachers/{id}`).
- `400 Bad Request`:

```json
{
  "detail": "Validation error"
}
```

## `PATCH /teachers/{id}`

- Body: те же поля, что в `POST /teachers`, все опциональны.

- `200 OK`: обновлённый учитель.
- `404 Not Found`:

```json
{
  "detail": "Teacher not found"
}
```

## `DELETE /teachers/{id}`

- `204 No Content` (без тела)
- `404 Not Found`:

```json
{
  "detail": "Teacher not found"
}
```

## Notes

- Если передан `age`, бэкенд конвертирует его в `birth_date`.
