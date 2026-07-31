from fastapi.testclient import TestClient
from decimal import Decimal
from datetime import datetime, timedelta

from main import app
from tests.helpers import (
    create_user_and_get_token,
    create_workout,
    create_exercise,
    create_set,
    create_completed_workout_on_date,
    auth_headers,
    complete_workout,
)    


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

    consistency = data["consistency"]

    assert consistency["active_days"] == 0
    assert consistency["active_weeks"] == 0
    assert consistency["current_week_streak"] == 0
    assert consistency["best_week_streak"] == 0
    assert consistency["days"] == []


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


def test_strength_progress_selects_best_set_for_day():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token, workout_id, name="bench press")
    exercise_id = exercise_response.json()["id"]

    create_set(token, exercise_id, weight="80", reps=6)
    create_set(token, exercise_id, weight="90", reps=3)

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
    assert Decimal(data["current_estimated_1rm"]) == Decimal("99.00")
    assert len(data["points"]) == 1

    point = data["points"][0]

    assert Decimal(point["estimated_1rm"]) == Decimal("99.00")
    assert Decimal(point["weight"]) == Decimal("90")
    assert point["reps"] == 3


def test_strength_progress_returns_empty_result_without_weighted_sets():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    create_exercise(token, workout_id, name="push ups with handstand")

    client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "moderate"},
    )

    response = client.get(
        "/api/v1/progress/strength",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "exercise_name": "Push Ups With Handstand",
            "months": 6,
        },
    )

    data = response.json()

    assert response.status_code == 200
    assert data["exercise_name"] == "Push Ups With Handstand"
    assert data["current_estimated_1rm"] is None
    assert data["change_percent"] is None
    assert data["points"] == []


def test_strength_progress_rejects_invalid_period():
    token = create_user_and_get_token()

    response = client.get(
        "/api/v1/progress/strength",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "exercise_name": "Bench Press",
            "months": 5,
        },
    )

    assert response.status_code == 422


def test_progress_exercises_requires_authentication():
    response = client.get("/api/v1/progress/exercises")

    assert response.status_code == 401


def test_progress_exercises_normalizes_duplicate_names():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    exercise_response_1 = create_exercise(token, workout_id, name="bench press")
    exercise_response_2 = create_exercise(token, workout_id, name="Bench Press")

    exercise_id_1 = exercise_response_1.json()["id"]
    exercise_id_2 = exercise_response_2.json()["id"]

    create_set(token, exercise_id_1, weight="80", reps=6)
    create_set(token, exercise_id_2, weight="90", reps=3)

    client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "moderate"},
    )

    response = client.get(
        "/api/v1/progress/exercises",
        headers={"Authorization": f"Bearer {token}"},
    )

    data = response.json()

    assert response.status_code == 200
    assert data == [
        {"name": "Bench Press"},
    ]


def test_strength_progress_does_not_return_another_users_data():
    token_1 = create_user_and_get_token()
    token_2 = create_user_and_get_token()

    workout_response = create_workout(token_1)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token_1, workout_id, name="bench press")
    exercise_id = exercise_response.json()["id"]

    create_set(token_1, exercise_id, weight="80", reps=6)

    client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token_1}"},
        json={"effort_level": "moderate"},
    )

    response_1 = client.get(
        "/api/v1/progress/strength",
        headers={"Authorization": f"Bearer {token_1}"},
        params={
            "exercise_name": "Bench Press",
            "months": 6,
        },
    )

    response_2 = client.get(
        "/api/v1/progress/strength",
        headers={"Authorization": f"Bearer {token_2}"},
        params={
            "exercise_name": "Bench Press",
            "months": 6,
        },
    )

    assert response_1.status_code == 200
    assert response_2.status_code == 200

    data_1 = response_1.json()
    data_2 = response_2.json()

    assert data_1["exercise_name"] == "bench press"
    assert Decimal(data_1["current_estimated_1rm"]) == Decimal("96.00")

    assert data_2["exercise_name"] == "Bench Press"
    assert data_2["current_estimated_1rm"] is None
    assert data_2["change_percent"] is None
    assert data_2["points"] == []


def test_progress_overview_returns_consistency(db_session):
    now = datetime.now()

    current_week_start = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=10,
        minute=0,
        second=0,
        microsecond=0,
    )

    previous_week_start = current_week_start - timedelta(days=7)

    first_date = previous_week_start
    second_date = previous_week_start + timedelta(days=3)
    third_date = current_week_start

    token = create_user_and_get_token()

    create_completed_workout_on_date(
        token,
        db_session,
        first_date,
    )
    create_completed_workout_on_date(
        token,
        db_session,
        second_date,
    )
    create_completed_workout_on_date(
        token,
        db_session,
        third_date,
    )

    response = client.get(
        "/api/v1/progress/overview",
        headers={"Authorization": f"Bearer {token}"},
        params={"months": 6},
    )

    assert response.status_code == 200

    consistency = response.json()["consistency"]

    assert consistency["active_days"] == 3
    assert consistency["active_weeks"] == 2
    assert consistency["current_week_streak"] == 2
    assert consistency["best_week_streak"] == 2
    assert len(consistency["days"]) == 3

    expected_dates = [
        first_date.date().isoformat(),
        second_date.date().isoformat(),
        third_date.date().isoformat(),
    ]

    actual_dates = [
        item["date"]
        for item in consistency["days"]
    ]

    assert actual_dates == expected_dates


def test_progress_consistency_resets_current_streak_after_gap(db_session):
    now = datetime.now()

    current_week_start = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=10,
        minute=0,
        second=0,
        microsecond=0,
    )

    three_weeks_ago_start = current_week_start - timedelta(days=21)
    two_weeks_ago_start = current_week_start - timedelta(days=14)

    first_date = three_weeks_ago_start
    second_date = two_weeks_ago_start
    third_date = current_week_start

    token = create_user_and_get_token()

    create_completed_workout_on_date(
        token,
        db_session,
        first_date,
    )
    create_completed_workout_on_date(
        token,
        db_session,
        second_date,
    )
    create_completed_workout_on_date(
        token,
        db_session,
        third_date,
    )

    response = client.get(
        "/api/v1/progress/overview",
        headers={"Authorization": f"Bearer {token}"},
        params={"months": 6},
    )

    assert response.status_code == 200

    consistency = response.json()["consistency"]

    assert consistency["active_weeks"] == 3
    assert consistency["current_week_streak"] == 1
    assert consistency["best_week_streak"] == 2


def test_progress_consistency_groups_same_day_and_uses_highest_effort(db_session):
    now = datetime.now()

    token = create_user_and_get_token()

    create_completed_workout_on_date(
        token,
        db_session,
        now,
        "light"
    )
    create_completed_workout_on_date(
        token,
        db_session,
        now,
        "very_hard"
    )

    response = client.get(
        "/api/v1/progress/overview",
        headers={"Authorization": f"Bearer {token}"},
        params={"months": 6},
    )

    assert response.status_code == 200

    consistency = response.json()["consistency"]

    assert consistency["active_days"] == 1
    assert consistency["days"][0]["workouts"] == 2
    assert consistency["days"][0]["effort_level"] == "very_hard"


def test_personal_records_returns_empty_list_without_sets():
    token = create_user_and_get_token()

    response = client.get(
        "/api/v1/progress/personal-records",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert response.json() == []


def test_personal_records_selects_best_set_for_exercise():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout = workout_response.json()
    workout_id = workout["id"]

    exercise_response = create_exercise(token, workout_id, name="bench press")
    exercise_id = exercise_response.json()["id"]

    create_set(token, exercise_id, weight="80", reps=6)
    create_set(token, exercise_id, weight="90", reps=3)
    create_set(token, exercise_id, weight="85", reps=5)

    completion_response = complete_workout(token, workout_id, "hard")
    assert completion_response.status_code == 200

    response = client.get(
        "/api/v1/progress/personal-records",
        headers=auth_headers(token),
    )

    assert response.status_code == 200

    records = response.json()

    assert len(records) == 1

    record = records[0]

    assert record["exercise_name"] == "Bench Press"
    assert Decimal(record["weight"]) == Decimal("85")
    assert record["reps"] == 5
    assert Decimal(record["estimated_1rm"]) == Decimal("99.17")
    assert record["workout_date"] == workout["date"][:10]


def test_personal_records_exercises_normalizes_duplicate_names():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    exercise_response_1 = create_exercise(token, workout_id, name="bench press")
    exercise_response_2 = create_exercise(token, workout_id, name=" Bench Press ")

    exercise_id_1 = exercise_response_1.json()["id"]
    exercise_id_2 = exercise_response_2.json()["id"]

    create_set(token, exercise_id_1, weight="80", reps=6)
    create_set(token, exercise_id_2, weight="90", reps=3)

    client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "moderate"},
    )

    response = client.get(
        "/api/v1/progress/personal-records",
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    
    records = response.json()
    
    assert len(records) == 1
    assert records[0]["exercise_name"] == "Bench Press"


def test_personal_records_does_not_return_another_users_data():
    token_1 = create_user_and_get_token()
    token_2 = create_user_and_get_token()

    workout_response = create_workout(token_1)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token_1, workout_id, name="bench press")
    exercise_id = exercise_response.json()["id"]

    create_set(token_1, exercise_id, weight="80", reps=6)

    client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token_1}"},
        json={"effort_level": "moderate"},
    )

    response_1 = client.get(
        "/api/v1/progress/personal-records",
        headers={"Authorization": f"Bearer {token_1}"},
        params={
            "exercise_name": "Bench Press",
            "months": 6,
        },
    )

    response_2 = client.get(
        "/api/v1/progress/personal-records",
        headers={"Authorization": f"Bearer {token_2}"},
        params={
            "exercise_name": "Bench Press",
            "months": 6,
        },
    )

    assert response_1.status_code == 200
    assert response_2.status_code == 200

    records_1 = response_1.json()
    records_2 = response_2.json()

    assert len(records_1) == 1
    assert records_1[0]["exercise_name"] == "Bench Press"
    assert records_2 == []


def test_personal_records_requires_authentication():
    response = client.get(
        "/api/v1/progress/personal-records"
    )

    assert response.status_code == 401


def test_personal_records_rejects_invalid_limit():
    token = create_user_and_get_token()

    response = client.get(
        "/api/v1/progress/personal-records",
        headers=auth_headers(token),
        params={"limit": 0},
    )

    assert response.status_code == 422

