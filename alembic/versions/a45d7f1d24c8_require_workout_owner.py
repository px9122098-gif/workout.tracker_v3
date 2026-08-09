"""require workout owner

Revision ID: a45d7f1d24c8
Revises: 7eaaf6c63524
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op


revision: str = "a45d7f1d24c8"
down_revision: Union[str, Sequence[str], None] = "7eaaf6c63524"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    orphan_count = connection.exec_driver_sql(
        "SELECT COUNT(*) FROM workout WHERE user_id IS NULL"
    ).scalar_one()

    if orphan_count:
        raise RuntimeError(
            "Cannot require workout.user_id while orphan workouts exist. "
            "Assign or delete those workouts, then run the migration again."
        )

    op.alter_column("workout", "user_id", nullable=False)
    op.create_index("ix_workout_user_id", "workout", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_workout_user_id", table_name="workout")
    op.alter_column("workout", "user_id", nullable=True)
