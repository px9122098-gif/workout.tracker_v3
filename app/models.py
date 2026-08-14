from sqlalchemy import VARCHAR, ForeignKey, Numeric, String, Integer, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal
from app.database import Base
from app.time_utils import app_now


class User(Base):
    __tablename__ = "app_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(default=app_now)
    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan", order_by="Workout.id")
    refresh_sessions = relationship(
        "RefreshSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class RefreshSession(Base):
    __tablename__ = "refresh_session"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("app_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    family_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(default=app_now)
    expires_at: Mapped[datetime] = mapped_column(nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    user = relationship("User", back_populates="refresh_sessions")


class Workout(Base):
    __tablename__ = "workout"

    __table_args__ = (
        CheckConstraint(
            "effort_level IS NULL OR "
            "effort_level IN ('light', 'moderate', 'hard', 'very_hard')",
            name="check_workout_effort_level"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("app_users.id"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(127))
    date: Mapped[datetime] = mapped_column(default=app_now)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    user = relationship("User", back_populates="workouts")
    exercises = relationship("Exercise", back_populates="workout", cascade="all, delete-orphan", order_by="Exercise.id")
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    effort_level: Mapped[str | None] = mapped_column(VARCHAR(16), nullable=True)


class Exercise(Base):
    __tablename__ = "exercise"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workout_id: Mapped[int] = mapped_column(Integer, ForeignKey("workout.id"))
    name: Mapped[str] = mapped_column(String(127))
    workout = relationship("Workout", back_populates="exercises")
    sets = relationship("WorkoutSet", back_populates="exercise", cascade="all, delete-orphan", order_by="WorkoutSet.id")


class WorkoutSet(Base):
    __tablename__ = "workout_set"

    __table_args__ = (
        CheckConstraint("reps > 0", name="check_reps_positive"),
        CheckConstraint("weight >= 0", name="check_weight_not_negative"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey("exercise.id"))
    weight: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    reps: Mapped[int] = mapped_column()
    exercise = relationship("Exercise", back_populates="sets")

