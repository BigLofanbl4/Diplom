# Diplom

## Run project

The frontend requests API under `/api/v1` (through Vite proxy to `http://127.0.0.1:8000`).

1. Start backend:
```bash
./.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
2. In another terminal start frontend:
```bash
npm run dev
```

Demo auth credentials:
- `admin` / `AdminDemo!2026`
- `manager` / `ManagerDemo!2026`
- `teacher` / `TeacherDemo!2026`
- `student` / `StudentDemo!2026`
