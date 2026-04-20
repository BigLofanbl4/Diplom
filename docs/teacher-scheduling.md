# Teacher Scheduling

## Что хранит мок сейчас

Для повторяющейся доступности преподавателя используется `teachers.schedule_preferences`.

Пример:

```json
[
  {
    "id": "slot-1",
    "day": "monday",
    "start": "10:00",
    "end": "15:00"
  }
]
```

Для группы хранится уже не только `teacher_id`, но и её собственное расписание:

```json
{
  "teacher_id": 1,
  "planned_start_date": "2026-05-04",
  "planned_end_date": null,
  "planned_schedule_slots": [
    {
      "id": "group-slot-3",
      "day": "monday",
      "start": "12:00",
      "end": "15:00"
    }
  ]
}
```

## Почему этого достаточно для мока

Такая схема позволяет отдельно хранить:

1. Базовую weekly-доступность преподавателя.
2. Повторяющееся weekly-расписание группы.
3. Дату, с которой группа реально начинает занимать слот.

Из-за этого преподаватель с будущим стартом группы остается свободным до конкретной даты старта для срочных замен, но уже может считаться недоступным для нового долгого recurring-назначения на этот же слот.

## Как считается доступность

`GET /api/v1/teachers?group_id=:id`

Сервер проверяет:

1. Подходит ли курс группы под `teacher.course_ids`.
2. Покрывают ли weekly-слоты преподавателя weekly-слоты группы.
3. Есть ли пересечение с уже назначенными группами этого преподавателя по:
   - дню недели
   - времени
   - диапазону дат `planned_start_date/planned_end_date`

В ответе каждый преподаватель получает поле:

```json
{
  "availability_for_group": {
    "is_available": false,
    "reasons": [
      "Есть пересечение с уже назначенной группой после даты старта."
    ],
    "conflicts": [
      {
        "group_id": 2,
        "group_number": "102",
        "start_date": "2026-05-18",
        "end_date": null,
        "slot": {
          "day": "monday",
          "start": "12:00",
          "end": "15:00"
        }
      }
    ]
  }
}
```

Для срочной замены есть отдельный сценарий:

`GET /api/v1/teachers?replacement_date=2026-04-27&replacement_start=12:00&replacement_end=13:00`

Он считает доступность только на конкретную дату, а не на весь будущий recurring-интервал.

## Как сделать на FastAPI + PostgreSQL

На реальном бэке лучше разнести это на отдельные сущности.

### 1. Повторяющаяся доступность преподавателя

```sql
create table teacher_availability_rules (
  id bigserial primary key,
  teacher_id bigint not null references teachers(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  valid_from date null,
  valid_to date null,
  is_active boolean not null default true,
  check (start_time < end_time)
);
```

### 2. Расписание группы

```sql
create table group_schedule_slots (
  id bigserial primary key,
  group_id bigint not null references groups(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);
```

### 3. Назначение преподавателя на группу

```sql
create table teacher_group_assignments (
  id bigserial primary key,
  teacher_id bigint not null references teachers(id) on delete restrict,
  group_id bigint not null references groups(id) on delete cascade,
  start_date date not null,
  end_date date null,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  check (end_date is null or start_date <= end_date)
);
```

### Почему так лучше

`teacher_group_assignments` отделяет сам факт назначения от weekly-слотов группы. Это удобно, если:

1. У группы сменился преподаватель.
2. Нужно хранить историю назначений.
3. У одной группы бывают переносы, паузы или завершение.

## Индексы для PostgreSQL

Минимальный набор:

```sql
create index idx_teacher_availability_active
  on teacher_availability_rules (teacher_id, weekday, start_time, end_time)
  where is_active = true;

create index idx_group_schedule_slots_group
  on group_schedule_slots (group_id, weekday, start_time, end_time);

create index idx_teacher_group_assignments_active
  on teacher_group_assignments (teacher_id, start_date, end_date, status);
```

## Логика фильтрации на проде

Для подбора преподавателя на recurring-группу:

1. Берем weekly-слоты группы.
2. Ищем преподавателей, у которых есть покрывающие availability rules.
3. Исключаем преподавателей, у которых есть активные `teacher_group_assignments`, пересекающиеся по датам.
4. Проверяем пересечение по weekday + time через `group_schedule_slots`.

Для срочной замены:

1. Берем конкретную дату и время.
2. Определяем weekday.
3. Проверяем `teacher_availability_rules`.
4. Исключаем только те назначения, которые активны именно на эту дату.

## Что важно не делать

Не стоит хранить все только в одном поле вроде `teacher.schedule_preferences` и пытаться туда же вписывать будущие группы. Тогда невозможно корректно ответить на вопрос:

"Свободен ли преподаватель в понедельник 12:00-15:00 именно 2026-04-27, если другая группа стартует только 2026-05-18?"

Для этого recurring-доступность и фактические назначения должны быть разными сущностями.
