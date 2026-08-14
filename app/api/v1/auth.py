from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session


from app.config import settings
from app.dependency import get_db, get_current_user
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.service import auth as auth_service
from app.models import User


router = APIRouter()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
    )
    response.headers["Cache-Control"] = "no-store"


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
    )


def _refresh_auth_error(detail: str) -> HTTPException:
    cookie_response = Response()
    _clear_refresh_cookie(cookie_response)
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"Set-Cookie": cookie_response.headers["set-cookie"]},
    )

@router.post("/register", response_model=UserResponse)
def register_user(register_data: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(db, register_data)


@router.post("/login", response_model=TokenResponse)
def login_user(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    token_response, refresh_token = auth_service.login_user(db, login_data)
    _set_refresh_cookie(response, refresh_token)
    return token_response


@router.post("/refresh", response_model=TokenResponse)
def refresh_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    refresh_token = request.cookies.get(settings.refresh_cookie_name)

    if not refresh_token:
        raise _refresh_auth_error("Refresh session is missing")

    try:
        token_response, next_refresh_token = auth_service.refresh_session(
            db,
            refresh_token,
        )
    except HTTPException as error:
        raise _refresh_auth_error(str(error.detail)) from error

    _set_refresh_cookie(response, next_refresh_token)
    return token_response


@router.post("/logout", status_code=204)
def logout_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    auth_service.logout_session(
        db,
        request.cookies.get(settings.refresh_cookie_name),
    )
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
