from datetime import timedelta
from uuid import uuid4

from sqlalchemy.orm import Session
from fastapi import HTTPException


from app.repository import users as users_repository
from app.repository import auth_sessions as sessions_repository
from app.config import settings
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.time_utils import app_now


def register_user(db: Session, register_data: RegisterRequest) -> UserResponse:
    email = register_data.email.strip().lower()

    if users_repository.get_user_by_email(db, email):
        raise HTTPException(
            status_code=400,
            detail=f"User with email '{email}' already exists",
        )
    
    hashed = hash_password(register_data.password)
    user = users_repository.create_user(db, email, hashed)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


def _issue_refresh_session(
    db: Session,
    user_id: int,
    family_id: str | None = None,
) -> str:
    raw_token = create_refresh_token()
    sessions_repository.create_session(
        db=db,
        user_id=user_id,
        token_hash=hash_refresh_token(raw_token),
        family_id=family_id or str(uuid4()),
        expires_at=app_now() + timedelta(days=settings.refresh_token_expire_days),
    )
    return raw_token


def _token_response(user_id: int) -> TokenResponse:
    return TokenResponse(access_token=create_access_token({"sub": str(user_id)}))


def login_user(db: Session, login_data: LoginRequest) -> tuple[TokenResponse, str]:
    email = login_data.email.strip().lower()
    user = users_repository.get_user_by_email(db, email)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    is_password_valid = verify_password(login_data.password, user.hashed_password)

    if not is_password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    refresh_token = _issue_refresh_session(db, user.id)
    db.commit()
    return _token_response(user.id), refresh_token


def refresh_session(db: Session, raw_token: str) -> tuple[TokenResponse, str]:
    session = sessions_repository.get_session_by_token_hash(
        db,
        hash_refresh_token(raw_token),
    )

    if session is None:
        raise HTTPException(status_code=401, detail="Invalid refresh session")

    now = app_now()

    if session.revoked_at is not None:
        sessions_repository.revoke_family(db, session.family_id, now)
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh session was already used")

    if session.expires_at <= now:
        sessions_repository.revoke_session(session, now)
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh session expired")

    sessions_repository.revoke_session(session, now)
    next_refresh_token = _issue_refresh_session(
        db,
        session.user_id,
        session.family_id,
    )
    db.commit()
    return _token_response(session.user_id), next_refresh_token


def logout_session(db: Session, raw_token: str | None) -> None:
    if not raw_token:
        return

    session = sessions_repository.get_session_by_token_hash(
        db,
        hash_refresh_token(raw_token),
    )

    if session is None:
        return

    sessions_repository.revoke_family(db, session.family_id, app_now())
    db.commit()
