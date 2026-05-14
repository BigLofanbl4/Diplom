from __future__ import annotations

import mimetypes

from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.models.courses import Course, File as CourseFile
from app.models.groups import Group
from app.models.organization import User
from app.models.portal import HomeworkSubmission
from app.utils.api_errors import forbidden, not_found
from app.utils.file_storage import resolve_stored_path


class FileAccessService:
    def __init__(self, db: Session, current_user: User):
        self.db = db
        self.current_user = current_user

    def download_course_material(self, file_id: int) -> FileResponse:
        file = self.db.get(CourseFile, file_id)
        if file is None or file.material is None or file.material.course is None:
            raise not_found("File not found")
        if not self._can_access_course_file(file.material.course):
            raise forbidden()
        return self._file_response(file.path, file.name)

    def download_homework_submission_file(self, submission_id: int, file_id: str) -> FileResponse:
        submission = self.db.get(HomeworkSubmission, submission_id)
        if submission is None:
            raise not_found("File not found")
        if not self._can_access_homework_submission(submission):
            raise forbidden()

        file_data = next(
            (file for file in submission.files or [] if str(file.get("id")) == str(file_id)),
            None,
        )
        if file_data is None:
            raise not_found("File not found")
        return self._file_response(file_data.get("path"), file_data.get("name") or "file")

    def _role(self) -> str:
        return self.current_user.role.value if hasattr(self.current_user.role, "value") else str(self.current_user.role)

    @staticmethod
    def _student_in_group(group: Group | None, student_id: int | None) -> bool:
        if group is None or student_id is None:
            return False
        return any(student.id == student_id for student in group.students)

    def _can_access_course_file(self, course: Course) -> bool:
        if course.organization_id != self.current_user.organization_id:
            return False

        role = self._role()
        if role in {"admin", "manager"}:
            return True
        if role == "teacher" and self.current_user.teacher is not None:
            return course.teacher_id == self.current_user.teacher.id
        if role == "student" and self.current_user.student is not None and course.group_id is not None:
            return self._student_in_group(self.db.get(Group, course.group_id), self.current_user.student.id)
        return False

    def _can_access_homework_submission(self, submission: HomeworkSubmission) -> bool:
        course = submission.course
        if course.organization_id != self.current_user.organization_id:
            return False

        role = self._role()
        if role in {"admin", "manager"}:
            return True
        if role == "student" and self.current_user.student is not None:
            return submission.student_id == self.current_user.student.id
        if role == "teacher" and self.current_user.teacher is not None:
            if course.teacher_id == self.current_user.teacher.id:
                return True
            if course.group_id is None:
                return False
            group = self.db.get(Group, course.group_id)
            return bool(
                group
                and group.teacher_id == self.current_user.teacher.id
                and self._student_in_group(group, submission.student_id)
            )
        return False

    @staticmethod
    def _file_response(relative_path: str | None, filename: str) -> FileResponse:
        path = resolve_stored_path(relative_path)
        media_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        return FileResponse(path=path, media_type=media_type, filename=filename)
