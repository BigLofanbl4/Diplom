### 6.03.2026

  
---  
**Проблема**: разобраться, зачем нужно использовать классы (`OAuth2PasswordBearer`, `OAuth2PasswordRequestForm`)

**Решение**: `OAuth2PasswordBearer` нужен для того, чтобы получать токен из запроса, он ищет заголовок запроса,
`Authorization`, считывает, что его тип является `Bearer` и возвращает строку, тот самый токен.

`OAuth2PasswordRequestForm` нужен для того, чтобы принимать форму с полями:

- `username`
- `password`
- `client_id` - необязательное
- `client_secret` - необязательное
- `scopes` - необязательное