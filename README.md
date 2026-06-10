# Diplom

## Run project

The frontend requests API under `/api/v1` (through Vite proxy to `http://127.0.0.1:8000`).

1. Create local environment file:
```bash
cp .env.example .env
```

2. Install backend dependencies:
```bash
./.venv/bin/python -m ensurepip --upgrade
./.venv/bin/python -m pip install -r requirements.txt
```

3. Start PostgreSQL:
```bash
docker compose up -d db
```

4. Apply database migrations:
```bash
./.venv/bin/alembic upgrade head
```

5. Start backend:
```bash
./.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

6. In another terminal start frontend:
```bash
npm run dev
```

Demo auth credentials:
- `admin` / `AdminDemo!2026`
- `manager` / `ManagerDemo!2026`
- `teacher` / `TeacherDemo!2026`
- `student` / `StudentDemo!2026`

## PostgreSQL

The local database runs in Docker Compose as `diplom-postgres`.

Useful commands:
```bash
docker compose ps
docker compose logs db
docker exec -it diplom-postgres psql -U diplom -d diplom
docker compose stop db
```

To remove the container but keep data:
```bash
docker compose down
```

To remove the container and database data:
```bash
docker compose down -v
```
