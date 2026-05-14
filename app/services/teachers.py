from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.groups import Group
from app.models.organization import User
from app.models.teachers import Teacher
from app.repositories import GroupRepository, TeacherRepository
from app.schemas import GroupRef
from app.schemas.teachers import (
    TeacherCreateRequest,
    TeacherDetail,
    TeacherListItem,
    TeachersListMeta,
    TeachersListResponse,
    TeacherUpdateRequest,
)
from app.utils.api_errors import forbidden, not_found
from app.utils.schedule import date_ranges_overlap, normalize_schedule_slots, schedule_contains_slot, slots_overlap


class TeacherAdminService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
        self.repo = TeacherRepository(db)

    def list_teachers(
        self,
        *,
        limit: int,
        offset: int,
        search: str | None = None,
        group_id: int | None = None,
    ) -> TeachersListResponse:
        teachers = self.repo.list(organization_id=self.current_user.organization_id)
        group = None
        if group_id is not None:
            target_group = GroupRepository(self.db).get(group_id)
            if target_group is not None and target_group.organization_id == self.current_user.organization_id:
                group = target_group
        teachers = sorted(teachers, key=lambda item: item.id)

        if search:
            term = search.lower()
            teachers = [
                teacher for teacher in teachers
                if term in teacher.first_name.lower()
                or term in teacher.last_name.lower()
                or (teacher.user is not None and term in teacher.user.login.lower())
                or (teacher.phone is not None and term in teacher.phone.lower())
            ]

        totals = len(teachers)
        page = teachers[offset:offset + limit]
        return TeachersListResponse(
            data=[self._to_teacher_list_item(teacher, group) for teacher in page],
            meta=TeachersListMeta(totals=totals, limit=limit, offset=offset, search=search),
        )

    def get_teacher(self, teacher_id: int) -> TeacherDetail:
        return self._to_teacher_detail(self._scoped_teacher_or_404(teacher_id))

    def create_teacher(self, data: TeacherCreateRequest) -> TeacherDetail:
        organization_id = self._resolve_organization_id(data.organization_id)
        self._validate_group_ids(data.group_ids, organization_id)

        try:
            teacher = self.repo.create(
                login=data.login,
                password=data.password,
                organization_id=organization_id,
                first_name=data.first_name,
                last_name=data.last_name,
                birth_date=self._resolve_birth_date(data.birth_date, data.age),
                phone=data.phone,
                is_ovz=data.is_ovz,
                course_ids=[],
                schedule_preferences=[],
                group_ids=data.group_ids,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        reloaded = self.repo.get(teacher.id)
        if reloaded is None:
            raise not_found("Teacher not found")
        return self._to_teacher_detail(reloaded)

    def update_teacher(self, teacher_id: int, data: TeacherUpdateRequest) -> TeacherDetail:
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

        self._scoped_teacher_or_404(teacher_id)
        provided_org_id = payload.get("organization_id")
        organization_id = (
            self._resolve_organization_id(provided_org_id)
            if "organization_id" in payload
            else None
        )
        self._validate_group_ids(payload.get("group_ids"), self.current_user.organization_id)

        birth_date = payload.get("birth_date")
        if "age" in payload and payload.get("age") is not None:
            birth_date = self._birth_date_from_age(payload["age"])

        try:
            teacher = self.repo.update(
                teacher_id,
                login=payload.get("login"),
                password=payload.get("password"),
                organization_id=organization_id,
                first_name=payload.get("first_name"),
                last_name=payload.get("last_name"),
                birth_date=birth_date,
                phone=payload.get("phone"),
                phone_set="phone" in payload,
                is_ovz=payload.get("is_ovz"),
                course_ids=payload.get("course_ids"),
                course_ids_set="course_ids" in payload,
                schedule_preferences=payload.get("schedule_preferences"),
                schedule_preferences_set="schedule_preferences" in payload,
                group_ids=payload.get("group_ids"),
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        if teacher is None:
            raise not_found("Teacher not found")
        return self._to_teacher_detail(teacher)

    def delete_teacher(self, teacher_id: int) -> None:
        self._scoped_teacher_or_404(teacher_id)
        self.repo.delete(teacher_id)

    def _scoped_teacher_or_404(self, teacher_id: int) -> Teacher:
        teacher = self.repo.get(teacher_id)
        if (
            teacher is None
            or teacher.user is None
            or teacher.user.organization_id != self.current_user.organization_id
        ):
            raise not_found("Teacher not found")
        return teacher

    def _validate_group_ids(self, group_ids: list[int] | None, organization_id: int) -> None:
        if group_ids is None:
            return
        repo = GroupRepository(self.db)
        for group_id in group_ids:
            group = repo.get(group_id)
            if group is None or group.organization_id != organization_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    def _resolve_organization_id(self, provided_org_id: int | None) -> int:
        if provided_org_id is None:
            return self.current_user.organization_id
        if provided_org_id != self.current_user.organization_id:
            raise forbidden()
        return provided_org_id

    @classmethod
    def _resolve_birth_date(cls, birth_date: date | None, age: int | None) -> date | None:
        if age is not None:
            return cls._birth_date_from_age(age)
        return birth_date

    @staticmethod
    def _birth_date_from_age(age: int) -> date:
        today = date.today()
        try:
            return today.replace(year=today.year - age)
        except ValueError:
            return today.replace(month=2, day=28, year=today.year - age)

    @classmethod
    def _to_teacher_list_item(cls, teacher: Teacher, group: Group | None = None) -> TeacherListItem:
        organization_id = teacher.user.organization_id if teacher.user is not None else 0
        login = teacher.user.login if teacher.user is not None else ""
        return TeacherListItem(
            id=teacher.id,
            login=login,
            phone=teacher.phone,
            first_name=teacher.first_name,
            last_name=teacher.last_name,
            age=teacher.age,
            is_ovz=teacher.is_ovz,
            organization_id=organization_id,
            groups_count=len(teacher.groups),
            availability_for_group=cls._build_availability_for_group(teacher, group),
        )

    @staticmethod
    def _to_teacher_detail(teacher: Teacher) -> TeacherDetail:
        organization_id = teacher.user.organization_id if teacher.user is not None else 0
        login = teacher.user.login if teacher.user is not None else ""
        groups = [GroupRef.model_validate(group) for group in teacher.groups]
        return TeacherDetail(
            id=teacher.id,
            first_name=teacher.first_name,
            last_name=teacher.last_name,
            phone=teacher.phone,
            age=teacher.age,
            birth_date=teacher.birth_date,
            is_ovz=teacher.is_ovz,
            organization_id=organization_id,
            login=login,
            group_ids=[group.id for group in teacher.groups],
            groups=groups,
            course_ids=list(teacher.course_ids or []),
            schedule_preferences=normalize_schedule_slots(teacher.schedule_preferences),
        )

    @staticmethod
    def _build_availability_for_group(teacher: Teacher, group: Group | None) -> dict | None:
        if group is None:
            return None

        reasons: list[str] = []
        conflicts: list[dict] = []
        group_slots = normalize_schedule_slots(group.planned_schedule_slots)
        teacher_schedule = normalize_schedule_slots(teacher.schedule_preferences)

        if group.template_course_id is not None and group.template_course_id not in (teacher.course_ids or []):
            reasons.append("Преподаватель не отметил этот курс в предпочтениях.")

        if group.planned_start_date is None:
            reasons.append("У группы не указана дата старта.")

        if not group_slots:
            reasons.append("У группы не заполнены weekly-слоты.")

        for slot in group_slots:
            if not schedule_contains_slot(teacher_schedule, slot):
                reasons.append("Базовая доступность преподавателя не покрывает один или несколько слотов группы.")
                break

        for assigned_group in teacher.groups:
            if assigned_group.id == group.id:
                continue
            if not date_ranges_overlap(
                assigned_group.planned_start_date,
                assigned_group.planned_end_date,
                group.planned_start_date,
                group.planned_end_date,
            ):
                continue
            for assigned_slot in normalize_schedule_slots(assigned_group.planned_schedule_slots):
                for requested_slot in group_slots:
                    if slots_overlap(assigned_slot, requested_slot):
                        conflicts.append(
                            {
                                "group_id": assigned_group.id,
                                "group_number": assigned_group.group_number,
                                "slot": assigned_slot,
                                "start_date": assigned_group.planned_start_date,
                                "end_date": assigned_group.planned_end_date,
                            }
                        )
        if conflicts:
            reasons.append("Есть пересечение с уже назначенной группой после даты старта.")

        return {
            "is_available": len(reasons) == 0,
            "reasons": reasons,
            "conflicts": conflicts,
        }
