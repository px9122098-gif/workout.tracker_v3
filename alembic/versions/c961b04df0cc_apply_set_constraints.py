"""apply set constraints

Revision ID: c961b04df0cc
Revises: 2276a3b756dc
Create Date: 2026-07-06 10:12:48.978918

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c961b04df0cc'
down_revision: Union[str, Sequence[str], None] = '2276a3b756dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_check_constraint(
        "check_reps_positive",
        "workout_set",
        "reps > 0",
    )

    op.create_check_constraint(
        "check_weight_not_negative",
        "workout_set",
        "weight >= 0",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("check_weight_not_negative", "workout_set", type_="check")
    op.drop_constraint("check_reps_positive", "workout_set", type_="check")
