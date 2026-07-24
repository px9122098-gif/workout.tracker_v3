from sqlalchemy.orm import Session
from fastapi import HTTPException


from app.repository import users as users_repository
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.security import hash_password, verify_password, create_access_token


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


def login_user(db: Session, login_data: LoginRequest) -> TokenResponse:
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

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)
  