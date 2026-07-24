from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session


from app.dependency import get_db, get_current_user
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.service import auth as auth_service
from app.models import User


router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register_user(register_data: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(db, register_data)


@router.post("/login", response_model=TokenResponse)
def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(db, login_data)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user