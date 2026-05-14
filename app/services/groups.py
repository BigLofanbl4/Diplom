from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.groups import Group
from app.models.organization import User
from app.repositories import CourseRepository, GroupRepository, StudentRepository, TeacherRepository
from app.schemas import CourseRef, StudentRef, TeacherRef
from app.schemas.groups import (
    GroupCreateRequest,
    GroupDetail,
    GroupListItem,
    GroupsListMeta,
    GroupsListResponse,
    GroupUpdateRequest,
)
from app.utils.api_errors import not_found
from app.utils.schedule import normalize_schedule_slots


class GroupAdminService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user
        self.repo = GroupRepository(db)

    def list_groups(self, *, limit: int, offset: int, search: str | None = None) -> GroupsListResponse:
        groups = self.repo.list(organization_id=self.current_user.organization_id)
        groups = sorted(groups, key=lambda item: item.id)

        if search:
            term = search.lower()
            groups = [group for group in groups if term in group.group_number.lower()]

        totals = len(groups)
        page = groups[offset:offset + limit]
        return GroupsListResponse(
            data=[self._to_group_list_item(group) for group in page],
            meta=GroupsListMeta(totals=totals, limit=limit, offset=offset, search=search),
        )

    def get_group(self, group_id: int) -> GroupDetail:
        return self._to_group_detail(self._scoped_group_or_404(group_id))

    def create_group(self, data: GroupCreateRequest) -> GroupDetail:
        self._validate_teacher_id(data.teacher_id)
        self._validate_course_id(data.course_id)
        self._validate_student_ids(data.student_ids)

        try:
            group = self.repo.create(
                group_number=data.group_number,
                organization_id=self.current_user.organization_id,
                teacher_id=data.teacher_id,
                student_ids=data.student_ids,
                course_id=data.course_id,
                planned_start_date=data.planned_start_date,
                planned_end_date=data.planned_end_date,
                planned_schedule_slots=normalize_schedule_slots(data.planned_schedule_slots),
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        reloaded = self.repo.get(group.id)
        if reloaded is None:
            raise not_found("Group not found")
        return self._to_group_detail(reloaded)

    def update_group(self, group_id: int, data: GroupUpdateRequest) -> GroupDetail:
        payload = data.model_dump(exclude_unset=True)
        if not payload:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields to update")

        self._scoped_group_or_404(group_id)
        self._validate_teacher_id(payload.get("teacher_id"))
        if "course_id" in payload:
            self._validate_course_id(payload.get("course_id"))
        self._validate_student_ids(payload.get("student_ids"))

        try:
            group = self.repo.update(
                group_id,
                group_number=payload.get("group_number"),
                teacher_id=payload.get("teacher_id"),
                teacher_id_set="teacher_id" in payload,
                student_ids=payload.get("student_ids"),
                course_id=payload.get("course_id"),
                course_id_set="course_id" in payload,
                planned_start_date=payload.get("planned_start_date"),
                planned_start_date_set="planned_start_date" in payload,
                planned_end_date=payload.get("planned_end_date"),
                planned_end_date_set="planned_end_date" in payload,
                planned_schedule_slots=normalize_schedule_slots(payload.get("planned_schedule_slots")),
                planned_schedule_slots_set="planned_schedule_slots" in payload,
            )
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

        if group is None:
            raise not_found("Group not found")
        return self._to_group_detail(group)

    def delete_group(self, group_id: int) -> None:
        self._scoped_group_or_404(group_id)
        self.repo.delete(group_id)

    def _scoped_group_or_404(self, group_id: int) -> Group:
        group = self.repo.get(group_id)
        if group is None or group.organization_id != self.current_user.organization_id:
            raise not_found("Group not found")
        return group

    def _validate_teacher_id(self, teacher_id: int | None) -> None:
        if teacher_id is None:
            return
        teacher = TeacherRepository(self.db).get(teacher_id)
        if teacher is None or teacher.user is None or teacher.user.organization_id != self.current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    def _validate_course_id(self, course_id: int | None) -> None:
        if course_id is None:
            return
        course = CourseRepository(self.db).get(course_id)
        if course is None or course.organization_id != self.current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    def _validate_student_ids(self, student_ids: list[int] | None) -> None:
        if student_ids is None:
            return
        repo = StudentRepository(self.db)
        for student_id in student_ids:
            student = repo.get(student_id)
            if (
                student is None
                or student.user is None
                or student.user.organization_id != self.current_user.organization_id
            ):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Validation error")

    @staticmethod
    def _to_group_list_item(group: Group) -> GroupListItem:
        course = CourseRef.model_validate(group.template_course) if group.template_course is not None else None
        return GroupListItem(
            id=group.id,
            group_number=group.group_number,
            teacher_id=group.teacher_id,
            course_id=group.template_course_id,
            course=course,
            students_count=len(group.students),
            planned_start_date=group.planned_start_date,
            planned_end_date=group.planned_end_date,
            planned_schedule_slots=normalize_schedule_slots(group.planned_schedule_slots),
        )

    @staticmethod
    def _to_group_detail(group: Group) -> GroupDetail:
        teacher = TeacherRef.model_validate(group.teacher) if group.teacher is not None else None
        course = CourseRef.model_validate(group.template_course) if group.template_course is not None else None
        students = [StudentRef.model_validate(student) for student in group.students]
        return GroupDetail(
            id=group.id,
            group_number=group.group_number,
            teacher_id=group.teacher_id,
            course_id=group.template_course_id,
            student_ids=[student.id for student in group.students],
            teacher=teacher,
            course=course,
            students=students,
            planned_start_date=group.planned_start_date,
            planned_end_date=group.planned_end_date,
            planned_schedule_slots=normalize_schedule_slots(group.planned_schedule_slots),
        )
