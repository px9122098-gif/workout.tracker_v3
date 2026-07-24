from uuid import uuid4

from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def unique_email() -> str:
    return f"pytest_{uuid4().hex}@example.com"


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

