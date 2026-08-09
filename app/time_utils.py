from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import settings


APP_TIMEZONE = ZoneInfo(settings.app_timezone)


def app_now() -> datetime:
    """Return a naive datetime in the configured application timezone."""
    return datetime.now(APP_TIMEZONE).replace(tzinfo=None)
