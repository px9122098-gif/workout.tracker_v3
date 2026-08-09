import os
from dataclasses import dataclass
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from dotenv import load_dotenv


load_dotenv()


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not set")
    return value


def _positive_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name, str(default))

    try:
        value = int(raw_value)
    except ValueError as error:
        raise RuntimeError(f"Environment variable {name} must be an integer") from error

    if value <= 0:
        raise RuntimeError(f"Environment variable {name} must be positive")

    return value


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    app_timezone: str
    cors_origins: tuple[str, ...]


def load_settings() -> Settings:
    app_timezone = os.getenv("APP_TIMEZONE", "Europe/Moscow").strip()

    try:
        ZoneInfo(app_timezone)
    except ZoneInfoNotFoundError as error:
        raise RuntimeError(f"Unknown APP_TIMEZONE: {app_timezone}") from error

    cors_origins = tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5500,http://localhost:5500",
        ).split(",")
        if origin.strip()
    )

    return Settings(
        database_url=_required_env("DATABASE_URL"),
        secret_key=_required_env("SECRET_KEY"),
        algorithm=os.getenv("ALGORITHM", "HS256").strip() or "HS256",
        access_token_expire_minutes=_positive_int_env(
            "ACCESS_TOKEN_EXPIRE_MINUTES",
            30,
        ),
        app_timezone=app_timezone,
        cors_origins=cors_origins,
    )


settings = load_settings()
