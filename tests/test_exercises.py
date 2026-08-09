from uuid import uuid4

from fastapi.testclient import TestClient

from main import app

from tests.helpers import complete_workout, create_user_and_get_token, create_workout, create_exercise


client = TestClient(app)


def test_user_can_add_exercise_to_own_workout():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    exercise_name = f"Push ups {uuid4().hex}"

    response = create_exercise(token, workout_id, exercise_name)

    assert response.status_code == 200

    data = response.json()
    assert data["name"] == exercise_name
    assert data["workout_id"] == workout_id
    assert "id" in data


def test_user_cannot_add_exercise_to_another_users_workout():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    workout_response = create_workout(token_a)
    workout_id = workout_response.json()["id"]

    response = create_exercise(token_b, workout_id)

    assert response.status_code == 404


def test_user_cannot_update_another_users_exercise():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    workout_response = create_workout(token_a)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token_a, workout_id)
    exercise_id = exercise_response.json()["id"]

    response = client.patch(
        f"/api/v1/exercises/{exercise_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"name": f"Hached exercise {uuid4().hex}"},
    )

    assert response.status_code == 404


def test_user_cannot_delete_another_users_exercise():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    workout_response = create_workout(token_a)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token_a, workout_id)
    exercise_id = exercise_response.json()["id"]

    response = client.delete(
        f"/api/v1/exercises/{exercise_id}",
        headers={"Authorization": f"Bearer {token_b}"},        
    )

    assert response.status_code == 404


def test_completed_workout_exercises_are_read_only():
    token = create_user_and_get_token()
    workout_id = create_workout(token).json()["id"]
    exercise_id = create_exercise(token, workout_id).json()["id"]

    assert complete_workout(token, workout_id).status_code == 200

    create_response = create_exercise(token, workout_id, "Late exercise")
    update_response = client.patch(
        f"/api/v1/exercises/{exercise_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Changed after completion"},
    )
    delete_response = client.delete(
        f"/api/v1/exercises/{exercise_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert create_response.status_code == 409
    assert update_response.status_code == 409
    assert delete_response.status_code == 409
