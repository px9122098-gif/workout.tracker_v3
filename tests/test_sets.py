from fastapi.testclient import TestClient

from main import app
from tests.helpers import create_user_and_get_token, create_workout, create_exercise, create_set


client = TestClient(app)



def test_user_can_add_set_to_own_exercise():
    token = create_user_and_get_token()

    workout_response = create_workout(token)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token, workout_id)
    exercise_id = exercise_response.json()["id"]

    response = create_set(token, exercise_id)

    assert response.status_code == 200

    data = response.json()
    assert data["exercise_id"] == exercise_id
    assert data["reps"] == 10
    assert data["weight"] == "60.50" or data["weight"] == 60.5
    assert "id" in data


def test_user_cannot_add_set_to_another_users_exercise():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    workout_response = create_workout(token_a)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token_a, workout_id)
    exercise_id = exercise_response.json()["id"]

    response = create_set(token_b, exercise_id)    

    assert response.status_code == 404


def test_user_cannot_update_another_users_set():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    workout_response = create_workout(token_a)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token_a, workout_id)
    exercise_id = exercise_response.json()["id"]

    set_response = create_set(token_a, exercise_id) 
    set_id = set_response.json()["id"]

    response = client.patch(
        f"/api/v1/sets/{set_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "weight": "100",
            "reps": 1,
        },
    )

    assert response.status_code == 404


def test_user_cannot_delete_another_users_set():
    token_a = create_user_and_get_token()
    token_b = create_user_and_get_token()

    workout_response = create_workout(token_a)
    workout_id = workout_response.json()["id"]

    exercise_response = create_exercise(token_a, workout_id)
    exercise_id = exercise_response.json()["id"]

    set_response = create_set(token_a, exercise_id) 
    set_id = set_response.json()["id"]

    response = client.delete(
        f"/api/v1/sets/{set_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )

    assert response.status_code == 404
