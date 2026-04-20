from __future__ import annotations

from datetime import date

WEEKDAY_BY_DAY = {
    "sunday": 0,
    "monday": 1,
    "tuesday": 2,
    "wednesday": 3,
    "thursday": 4,
    "friday": 5,
    "saturday": 6,
}


def normalize_time(value: str | None) -> str:
    return value.strip() if isinstance(value, str) else ""


def to_minutes(value: str | None) -> int:
    normalized = normalize_time(value)
    if not normalized or len(normalized) != 5 or normalized[2] != ":":
        return -1
    try:
        hours, minutes = normalized.split(":")
        hours_value = int(hours)
        minutes_value = int(minutes)
    except ValueError:
        return -1
    if not (0 <= hours_value <= 23 and 0 <= minutes_value <= 59):
        return -1
    return hours_value * 60 + minutes_value


def normalize_schedule_slots(slots: list[dict] | None) -> list[dict]:
    if not isinstance(slots, list):
        return []

    normalized: list[dict] = []
    for index, slot in enumerate(slots):
        day = str(slot.get("day", "")).strip().lower()
        start = normalize_time(slot.get("start"))
        end = normalize_time(slot.get("end"))
        start_minutes = to_minutes(start)
        end_minutes = to_minutes(end)
        if day not in WEEKDAY_BY_DAY or start_minutes < 0 or end_minutes < 0 or start_minutes >= end_minutes:
            continue
        normalized.append(
            {
                "id": slot.get("id") or f"slot-{index + 1}",
                "day": day,
                "start": start,
                "end": end,
            }
        )

    return sorted(normalized, key=lambda slot: (WEEKDAY_BY_DAY[slot["day"]], to_minutes(slot["start"])))


def schedule_contains_slot(schedule_preferences: list[dict] | None, requested_slot: dict) -> bool:
    preferences = normalize_schedule_slots(schedule_preferences)
    requested_start = to_minutes(requested_slot.get("start"))
    requested_end = to_minutes(requested_slot.get("end"))
    requested_day = requested_slot.get("day")

    for slot in preferences:
        slot_start = to_minutes(slot.get("start"))
        slot_end = to_minutes(slot.get("end"))
        if slot.get("day") != requested_day:
            continue
        if slot_start <= requested_start and slot_end >= requested_end:
            return True
    return False


def slots_overlap(left: dict, right: dict) -> bool:
    if left.get("day") != right.get("day"):
        return False

    left_start = to_minutes(left.get("start"))
    left_end = to_minutes(left.get("end"))
    right_start = to_minutes(right.get("start"))
    right_end = to_minutes(right.get("end"))
    if min(left_start, left_end, right_start, right_end) < 0:
        return False
    return left_start < right_end and right_start < left_end


def date_ranges_overlap(
    left_start: date | None,
    left_end: date | None,
    right_start: date | None,
    right_end: date | None,
) -> bool:
    effective_left_start = left_start or date.min
    effective_left_end = left_end or date.max
    effective_right_start = right_start or date.min
    effective_right_end = right_end or date.max
    return effective_left_start <= effective_right_end and effective_right_start <= effective_left_end
