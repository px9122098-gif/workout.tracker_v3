from fastapi.testclient import TestClient

from main import app
from app.security import create_access_token
from tests.helpers import unique_email


client = TestClient(app)


def test_register_user():
    email = unique_email()

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "12345678",
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["email"] == email
    assert "id" in data
    assert "created_at" in data
    assert "hashed_password" not in data


def test_register_duplicate_email_fails():
    email = unique_email()

    first_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "12345678"
        },
    )

    second_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "12345678"
        },
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 400
    assert second_response.json()["detail"] == f"User with email '{email}' already exists"


def test_login_user_returns_token():
    email = unique_email()
    password = "12345678"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert register_response.status_code == 200
    assert login_response.status_code == 200

    data = login_response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_with_wrong_password_fails():
    email = unique_email()
    password = "12345678"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "wrong-password",
        },
    )

    assert login_response.status_code == 401
    assert login_response.json()["detail"] == "Invalid email or password"


def test_get_me_returns_current_user():
    email = unique_email()
    password = "12345678"

    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    token = login_response.json()["access_token"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert me_response.status_code == 200

    data = me_response.json()
    assert data["email"] == email
    assert "id" in data
    assert "created_at" in data
    assert "hashed_password" not in data


def test_get_me_without_token_fails():
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_get_me_with_non_numeric_token_subject_fails():
    token = create_access_token({"sub": "not-a-user-id"})

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"
