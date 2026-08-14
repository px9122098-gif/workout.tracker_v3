from datetime import datetime

from sqlalchemy.orm import Session

from app.models import RefreshSession


def create_session(
    db: Session,
    user_id: int,
    token_hash: str,
    family_id: str,
    expires_at: datetime,
) -> RefreshSession:
    session = RefreshSession(
        user_id=user_id,
        token_hash=token_hash,
        family_id=family_id,
        expires_at=expires_at,
    )
    db.add(session)
    db.flush()
    return session


def get_session_by_token_hash(
    db: Session,
    token_hash: str,
) -> RefreshSession | None:
    return (
        db.query(RefreshSession)
        .filter(RefreshSession.token_hash == token_hash)
        .first()
    )


def revoke_session(session: RefreshSession, revoked_at: datetime) -> None:
    session.revoked_at = revoked_at


def revoke_family(db: Session, family_id: str, revoked_at: datetime) -> None:
    (
        db.query(RefreshSession)
        .filter(
            RefreshSession.family_id == family_id,
            RefreshSession.revoked_at.is_(None),
        )
        .update({RefreshSession.revoked_at: revoked_at}, synchronize_session=False)
    )
