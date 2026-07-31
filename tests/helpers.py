from datetime import datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from main import app
from app.models import Workout


client = TestClient(app)


def unique_email() -> str:
    return f"pytest_{uuid4().hex}@example.com"


def auth_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}"
    }


def complete_workout(
    token: str,
    workout_id: int,
    effort_level: str | None = "moderate",
):
    return client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers=auth_headers(token),
        json={"effort_level": effort_level},
    )


def create_user_and_get_token():
    email = unique_email()
    password = "12345678"

    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password
        },
    )

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password
        },
    )

    token = login_response.json()["access_token"]

    return token


def create_workout(token: str, title: str | None = None):
    if title is None: 
        title = f"Workout {uuid4().hex}"

    response = client.post(
        "/api/v1/workouts",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": title,
            "notes": "Initial notes",
        },
    )

    return response


def create_exercise(token: str, workout_id: int, name: str | None = None):
    if name is None:
        name = f"Exercise {uuid4().hex}"

    response = client.post(
        "/api/v1/exercises",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "workout_id": workout_id,
            "name": name,
        },
    )

    return response


def create_set(token: str, exercise_id: int, weight="60.5", reps=10):
    response = client.post(
        "/api/v1/sets",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "exercise_id": exercise_id,
            "weight": weight,
            "reps": reps,
        },
    )

    return response


def create_completed_workout_on_date(
    token: str,
    db_session,
    workout_date: datetime,
    effort_level: str | None = "moderate"
) -> int:
    workout_response = create_workout(token)

    assert workout_response.status_code == 200, workout_response.text

    workout_id = workout_response.json()["id"]

    completion_response = complete_workout(token, workout_id, effort_level)

    assert completion_response.status_code == 200, completion_response.text

    workout = db_session.get(Workout, workout_id)

    workout.date = workout_date
    db_session.commit()

    return workout_id


