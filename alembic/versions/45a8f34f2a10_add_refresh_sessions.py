"""add refresh sessions

Revision ID: 45a8f34f2a10
Revises: a45d7f1d24c8
Create Date: 2026-08-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "45a8f34f2a10"
down_revision: Union[str, Sequence[str], None] = "a45d7f1d24c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "refresh_session",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("family_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["app_users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_refresh_session_family_id",
        "refresh_session",
        ["family_id"],
    )
    op.create_index(
        "ix_refresh_session_token_hash",
        "refresh_session",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_refresh_session_user_id",
        "refresh_session",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_refresh_session_user_id", table_name="refresh_session")
    op.drop_index("ix_refresh_session_token_hash", table_name="refresh_session")
    op.drop_index("ix_refresh_session_family_id", table_name="refresh_session")
    op.drop_table("refresh_session")
