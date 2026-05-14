from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import API_PREFIX, login, response_json


def test_auth_login_refresh_current_user_and_invalid_credentials(client: TestClient) -> None:
    bad_login = client.post(
        f"{API_PREFIX}/auth/login",
        data={"username": "admin", "password": "wrong-password"},
    )
    assert bad_login.status_code == 401

    login_response = client.post(
        f"{API_PREFIX}/auth/login",
        data={"username": "admin", "password": "AdminDemo!2026"},
    )
    assert login_response.status_code == 200
    assert login_response.cookies.get("refresh_token")
    token_payload = login_response.json()
    assert token_payload["token_type"] == "bearer"
    assert token_payload["access_token"]

    current_user = client.get(
        f"{API_PREFIX}/auth/current_user",
        headers={"Authorization": f"Bearer {token_payload['access_token']}"},
    )
    assert current_user.status_code == 200
    assert current_user.json() == {
        "id": 1,
        "login": "admin",
        "role": "admin",
        "organization_id": 1,
        "first_name": "Админ",
        "last_name": "Платформы",
        "phone": None,
        "birth_date": None,
        "is_ovz": None,
    }

    refresh = client.post(f"{API_PREFIX}/auth/refresh")
    assert refresh.status_code == 200
    assert refresh.json()["access_token"]


def test_protected_endpoints_require_access_token(client: TestClient) -> None:
    response = client.get(f"{API_PREFIX}/students")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_students_crud_happy_path(client: TestClient) -> None:
    headers = login(client)

    create = client.post(
        f"{API_PREFIX}/students",
        headers=headers,
        json={
            "first_name": "Павел",
            "last_name": "Иванов",
            "login": "student-api-test",
            "password": "StudentTest!2026",
            "phone": "+79990000099",
            "birth_date": "2013-02-10",
            "group_ids": [],
        },
    )
    assert create.status_code == 201, create.text
    created = create.json()
    assert created["first_name"] == "Павел"
    assert created["login"] == "student-api-test"
    assert created["group_ids"] == []

    list_response = client.get(f"{API_PREFIX}/students", headers=headers)
    assert list_response.status_code == 200
    assert any(item["id"] == created["id"] for item in list_response.json()["data"])

    update = client.patch(
        f"{API_PREFIX}/students/{created['id']}",
        headers=headers,
        json={"first_name": "Пётр", "phone": "+79990000100"},
    )
    assert update.status_code == 200
    assert update.json()["first_name"] == "Пётр"
    assert update.json()["phone"] == "+79990000100"

    delete = client.delete(f"{API_PREFIX}/students/{created['id']}", headers=headers)
    assert delete.status_code == 204

    missing = client.get(f"{API_PREFIX}/students/{created['id']}", headers=headers)
    assert missing.status_code == 404


def test_course_module_lesson_and_test_constructor_flow(client: TestClient) -> None:
    headers = login(client)

    course_response = client.post(
        f"{API_PREFIX}/courses",
        headers=headers,
        json={"title": "Физика API", "description": "Курс для интеграционного теста"},
    )
    assert course_response.status_code == 201, course_response.text
    course = course_response.json()

    module_response = client.post(
        f"{API_PREFIX}/courses/{course['id']}/modules",
        headers=headers,
        json={"title": "Механика", "module_number": 1},
    )
    assert module_response.status_code == 201, module_response.text
    module = module_response.json()

    lesson_response = client.post(
        f"{API_PREFIX}/courses/{course['id']}/lessons",
        headers=headers,
        data={
            "title": "Скорость",
            "lesson_number": "1",
            "description": "Базовые формулы",
            "homework_text": "Решить задачи 1-3",
            "module_id": str(module["id"]),
        },
    )
    assert lesson_response.status_code == 201, lesson_response.text
    lesson = lesson_response.json()
    assert lesson["module_id"] == module["id"]
    assert lesson["homework_text"] == "Решить задачи 1-3"

    test_response = client.post(
        f"{API_PREFIX}/courses/{course['id']}/lessons/{lesson['id']}/test",
        headers=headers,
        json={
            "title": "Проверка скорости",
            "questions": [
                {
                    "uiId": "speed-question-1",
                    "number": 1,
                    "text": "Единица измерения скорости?",
                    "type": "single_choice",
                    "answer": ["м/с"],
                    "options": [
                        {"text": "м/с", "value": "м/с"},
                        {"text": "кг", "value": "кг"},
                    ],
                }
            ],
        },
    )
    assert test_response.status_code == 201, test_response.text
    test_payload = test_response.json()
    assert test_payload["title"] == "Проверка скорости"
    assert test_payload["questions_number"] == 1
    assert test_payload["questions"][0]["answer"] == ["м/с"]

    duplicate_test = client.post(
        f"{API_PREFIX}/courses/{course['id']}/lessons/{lesson['id']}/test",
        headers=headers,
        json={"title": "Дубликат", "questions": []},
    )
    assert duplicate_test.status_code == 400


def test_task_workflow_and_role_permissions(client: TestClient) -> None:
    admin_headers = login(client)
    teacher_headers = login(client, "teacher", "TeacherDemo!2026")
    student_headers = login(client, "student", "StudentDemo!2026")

    options = client.get(f"{API_PREFIX}/tasks/options", headers=admin_headers)
    assert options.status_code == 200
    teacher_id = response_json(options)["teachers"][0]["id"]

    task_response = client.post(
        f"{API_PREFIX}/tasks",
        headers=admin_headers,
        json={
            "type": "check_homework",
            "description": "Проверить домашнюю работу по seed-курсу",
            "assignee_teacher_id": teacher_id,
        },
    )
    assert task_response.status_code == 201, task_response.text
    task = task_response.json()
    assert task["status"] == "new"
    assert task["assignee"]["role"] == "teacher"

    teacher_tasks = client.get(f"{API_PREFIX}/tasks", headers=teacher_headers)
    assert teacher_tasks.status_code == 200
    assert any(item["id"] == task["id"] for item in teacher_tasks.json()["data"])

    update = client.patch(
        f"{API_PREFIX}/tasks/{task['id']}",
        headers=teacher_headers,
        json={"status": "in_progress"},
    )
    assert update.status_code == 200
    assert update.json()["status"] == "in_progress"

    forbidden_for_student = client.get(f"{API_PREFIX}/tasks", headers=student_headers)
    assert forbidden_for_student.status_code == 403


def test_student_and_teacher_portals_use_role_scoped_data(client: TestClient) -> None:
    admin_headers = login(client)
    student_headers = login(client, "student", "StudentDemo!2026")
    teacher_headers = login(client, "teacher", "TeacherDemo!2026")

    student_courses = client.get(f"{API_PREFIX}/students/me/courses", headers=student_headers)
    assert student_courses.status_code == 200, student_courses.text
    courses = student_courses.json()["data"]
    assert courses

    course_id = courses[0]["id"]
    module_response = client.post(
        f"{API_PREFIX}/courses/{course_id}/modules",
        headers=admin_headers,
        json={"module_number": 1},
    )
    assert module_response.status_code == 201, module_response.text
    lesson_response = client.post(
        f"{API_PREFIX}/courses/{course_id}/lessons",
        headers=admin_headers,
        data={"lesson_number": "1", "module_id": str(module_response.json()["id"])},
    )
    assert lesson_response.status_code == 201, lesson_response.text

    course_detail = client.get(f"{API_PREFIX}/students/me/courses/{course_id}", headers=student_headers)
    assert course_detail.status_code == 200, course_detail.text
    lesson_with_test = next(lesson for lesson in course_detail.json()["lessons"] if lesson["test_id"] is not None)

    test_response = client.get(
        f"{API_PREFIX}/students/me/courses/{course_id}/lessons/{lesson_with_test['id']}/test",
        headers=student_headers,
    )
    assert test_response.status_code == 200, test_response.text
    question = test_response.json()["questions"][0]

    attempt = client.post(
        f"{API_PREFIX}/students/me/courses/{course_id}/lessons/{lesson_with_test['id']}/test-attempts",
        headers=student_headers,
        json={"answers": {str(question["id"]): question["answer"]}},
    )
    assert attempt.status_code == 200, attempt.text
    assert attempt.json()["score"] == attempt.json()["total"] == 1

    teacher_groups = client.get(f"{API_PREFIX}/teachers/me/groups", headers=teacher_headers)
    assert teacher_groups.status_code == 200
    assert teacher_groups.json()["data"]

    teacher_cannot_open_student_portal = client.get(
        f"{API_PREFIX}/students/me/courses",
        headers=teacher_headers,
    )
    assert teacher_cannot_open_student_portal.status_code == 403
