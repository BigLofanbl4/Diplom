# API Errors Standard

Единый формат ошибок API:

```json
{
  "detail": "..."
}
```

## Cases

1. Не найдено:
- HTTP `404`
- Body: `{ "detail": "..." }`

2. Невалидный логин/пароль:
- HTTP `401`
- Body: `{ "detail": "Incorrect username or password" }`

3. Валидация FastAPI:
- HTTP `422`
- Используется стандартный ответ FastAPI.

4. Успешный DELETE:
- HTTP `204`
- Без тела ответа.
