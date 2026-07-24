from fastapi.testclient import TestClient
from decimal import Decimal
from datetime import date

from main import app
from tests.helpers import create_user_and_get_token, create_workout, create_exercise, create_set


client = TestClient(app)


def test_progress_overview_without_token_fails():
    response = client.get(
        "/api/v1/progress/overview",
        params={
            "months": 6,
        },
    )

    assert response.status_code == 401


def test_progress_overview_for_user_without_workouts():
    token = create_user_and_get_token()

    response = client.get(
        "/api/v1/progress/overview",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "months": "6",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["period"]["months"] == 6
    assert data["summary"]["workouts"] == 0
    assert Decimal(data["summary"]["volume"]) == Decimal("0")
    assert Decimal(data["summary"]["previous_volume"]) == Decimal("0")
    assert data["summary"]["volume_change_percent"] is None
    assert isinstance(data["weekly_volume"], list)

    assert len(data["weekly_volume"]) > 0

    assert all(
        item["workouts"] == 0
        for item in data["weekly_volume"]
    )

    assert all(
        Decimal(item["volume"]) == Decimal("0")
        for item in data["weekly_volume"]
    )


def test_progress_overview_rejects_invalid_period():
    token = create_user_and_get_token()
    response = client.get(
        "/api/v1/progress/overview",
        headers={"Authorization": f"Bearer {token}"},
        params={"months": 5},
    )

    assert response.status_code == 422


def test_progress_ignores_incomplete_workouts():
    token = create_user_and_get_token()
    create_workout(token)

    response = client.get(
        "/api/v1/progress/overview",
        headers={"Authorization": f"Bearer {token}"},
        params={"months": 6},
    )

    data = response.json()

    assert data["summary"]["workouts"] == 0
    assert Decimal(data["summary"]["volume"]) == Decimal("0")


def test_completed_workout_volume_is_included():
    token = create_user_and_get_token()
    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token, workout_id)
    exercise_id = exercise_response.json()["id"]

    create_set(token, exercise_id, weight="60.5", reps=10)

    client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "moderate"}
    )

    response = client.get(
        "/api/v1/progress/overview",
        headers={"Authorization": f"Bearer {token}"},
        params={"months": 6},
    )

    data = response.json()

    active_weeks = [
        item
        for item in data["weekly_volume"]
        if item["workouts"] > 0
    ]

    assert len(active_weeks) == 1

    active_week = active_weeks[0]

    assert active_week["workouts"] == 1
    assert Decimal(active_week["volume"]) == Decimal("605")


def test_progress_exercises_returns_completed_weighted_exercises():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token, workout_id, name="bench press")
    exercise_id = exercise_response.json()["id"]

    create_set(token, exercise_id, weight="80", reps=6)

    client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "moderate"},
    )

    response = client.get(
        "/api/v1/progress/exercises",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == [
        {"name": "Bench Press"}
    ]


def test_strength_progress():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token, workout_id, name="bench press")
    exercise_id = exercise_response.json()["id"]

    create_set(token, exercise_id, weight="80", reps=6)

    client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "moderate"},
    )

    response = client.get(
        "/api/v1/progress/strength",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "exercise_name": "Bench Press",
            "months": 6,
        },
    )

    data = response.json()

    assert response.status_code == 200
    assert data["exercise_name"] == "bench press"
    assert Decimal(data["current_estimated_1rm"]) == Decimal("96.00")
    assert data["change_percent"] is None
    assert len(data["points"]) == 1

    point = data["points"][0]

    assert Decimal(point["weight"]) == Decimal("80")
    assert point["reps"] == 6
    assert Decimal(point["estimated_1rm"]) == Decimal("96.00")

