from datetime import datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from main import app

from tests.helpers import create_user_and_get_token, create_workout


client = TestClient(app)


def test_create_workout_without_token_fails():
    title = f"Push day {uuid4().hex}"

    response = client.post(
        "/api/v1/workouts",
        json={
            "title": title,
            "notes": "Chest and triceps",
        },
    )

    assert response.status_code == 401


def test_create_workout_with_token():
    token = create_user_and_get_token()
    title = f"Push day {uuid4().hex}"

    response = client.post(
        "/api/v1/workouts",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "title": title,
            "notes": "Chest and triceps",
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["title"] == title
    assert data["notes"] == "Chest and triceps"
    assert "id" in data


def test_user_sees_only_own_workouts():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    title_a = f"Push day {uuid4().hex}"
    title_b = f"Push day {uuid4().hex}"

    client.post(
        "/api/v1/workouts",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"title": title_a},
    )

    client.post(
        "/api/v1/workouts",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": title_b},
    )

    response = client.get(
        "/api/v1/workouts",
        headers={"Authorization": f"Bearer {token_a}"},
    )

    assert response.status_code == 200

    titles = [workout["title"] for workout in response.json()]

    assert title_a in titles
    assert title_b not in titles


def test_user_can_get_own_workout_by_id():
    token = create_user_and_get_token()
    create_response = create_workout(token)

    workout_id = create_response.json()["id"]

    response = client.get(
        f"/api/v1/workouts/{workout_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == workout_id


def test_user_cannot_get_another_users_workout_by_id():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    create_response = create_workout(token_a)
    workout_id = create_response.json()["id"]

    response = client.get(
        f"/api/v1/workouts/{workout_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )

    assert response.status_code == 404


def test_user_cannot_update_another_users_workout():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    create_response = create_workout(token_a)
    workout_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/workouts/{workout_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"notes": "Hached notes"},
    )

    assert response.status_code == 404


def test_user_cannot_delete_another_users_workout():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    create_response = create_workout(token_a)
    workout_id = create_response.json()["id"]

    response = client.delete(
        f"/api/v1/workouts/{workout_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )

    assert response.status_code == 404


def test_user_can_complete_workout():
    token = create_user_and_get_token()
    create_response = create_workout(token)
    workout_id = create_response.json()["id"]

    response = client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "hard"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["completed_at"] is not None
    assert data["effort_level"] == "hard"


def test_completed_workout_cannot_be_completed_again():
    token = create_user_and_get_token()
    create_response = create_workout(token)
    workout_id = create_response.json()["id"]

    response_1 = client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "hard"},
    )

    response_2 = client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "hard"},
    )

    assert response_1.status_code == 200
    assert response_2.status_code == 409


def test_user_cannot_complete_another_users_workout():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()
    create_response = create_workout(token_a)
    workout_id = create_response.json()["id"]

    response = client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"effort_level": "hard"}
    )

    assert response.status_code == 404   


def test_complete_workout_rejects_invalid_effort():
    token = create_user_and_get_token()
    create_response = create_workout(token)
    workout_id = create_response.json()["id"]

    response = client.post(
        f"/api/v1/workouts/{workout_id}/complete",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "impossible"},
    )

    assert response.status_code == 422   


def test_update_workout_effort_preserves_notes():
    token = create_user_and_get_token()
    create_response = create_workout(token)
    workout_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/workouts/{workout_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "hard"}
    )

    assert response.status_code == 200

    assert response.json()["effort_level"] == "hard"
    assert response.json()["notes"] == "Initial notes"


def test_update_workout_rejects_invalid_effort():
    token = create_user_and_get_token()
    create_response = create_workout(token)
    workout_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/workouts/{workout_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "impossible"}
    )

    assert response.status_code == 422


def test_workout_overview_uses_highest_daily_effort():
    token = create_user_and_get_token()
    create_response_1 = create_workout(token)
    create_response_2 = create_workout(token)
    workout_id_1 = create_response_1.json()["id"]
    workout_id_2 = create_response_2.json()["id"]

    client.patch(
        f"/api/v1/workouts/{workout_id_1}",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "moderate"}
    )

    client.patch(
        f"/api/v1/workouts/{workout_id_2}",
        headers={"Authorization": f"Bearer {token}"},
        json={"effort_level": "very_hard"}
    )

    workout_date = datetime.fromisoformat(
        create_response_1.json()["date"]
    )

    response = client.get(
        f"/api/v1/workouts/overview",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "year": workout_date.year,
            "month": workout_date.month,
        },
    )

    assert response.status_code == 200

    data = response.json()

    day_activity = next(
        item 
        for item in data["activity"]
        if item["day"] == workout_date.day
    )

    assert day_activity["workouts"] == 2
    assert day_activity["effort_level"] == "very_hard"
    
