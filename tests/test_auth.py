import pytest
from fastapi.testclient import TestClient

from main import app
from app.config import settings
from app.security import create_access_token
from tests.helpers import unique_email


client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_auth_cookies():
    client.cookies.clear()
    yield
    client.cookies.clear()


def register_and_login() -> tuple[str, str]:
    email = unique_email()
    password = "12345678"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return email, response.json()["access_token"]


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
    assert login_response.cookies.get(settings.refresh_cookie_name)
    assert "httponly" in login_response.headers["set-cookie"].lower()
    assert "samesite=lax" in login_response.headers["set-cookie"].lower()


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


def test_refresh_rotates_session_and_returns_new_access_token():
    email, first_access_token = register_and_login()
    first_refresh_token = client.cookies.get(settings.refresh_cookie_name)

    response = client.post("/api/v1/auth/refresh")

    assert response.status_code == 200
    assert response.json()["access_token"] != first_access_token
    assert client.cookies.get(settings.refresh_cookie_name) != first_refresh_token

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {response.json()['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email


def test_reusing_rotated_refresh_token_revokes_session_family():
    register_and_login()
    first_refresh_token = client.cookies.get(settings.refresh_cookie_name)

    first_refresh_response = client.post("/api/v1/auth/refresh")
    current_refresh_token = client.cookies.get(settings.refresh_cookie_name)
    assert first_refresh_response.status_code == 200

    client.cookies.set(
        settings.refresh_cookie_name,
        first_refresh_token,
        path="/api/v1/auth",
    )
    replay_response = client.post("/api/v1/auth/refresh")
    assert replay_response.status_code == 401

    client.cookies.set(
        settings.refresh_cookie_name,
        current_refresh_token,
        path="/api/v1/auth",
    )
    family_response = client.post("/api/v1/auth/refresh")
    assert family_response.status_code == 401


def test_logout_revokes_refresh_session_and_clears_cookie():
    register_and_login()

    logout_response = client.post("/api/v1/auth/logout")

    assert logout_response.status_code == 204
    assert client.cookies.get(settings.refresh_cookie_name) is None
    assert client.post("/api/v1/auth/refresh").status_code == 401
