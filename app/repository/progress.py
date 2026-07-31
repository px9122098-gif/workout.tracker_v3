from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models import Exercise, Workout, WorkoutSet


def get_completed_workouts_for_period(
    db: Session,
    user_id: int,
    start_date: datetime,
    end_date: datetime,
) -> list[Workout]: 
    return (
        db.query(Workout)
        .options(
            selectinload(Workout.exercises)
            .selectinload(Exercise.sets)
        )
        .filter(
            Workout.user_id == user_id,
            Workout.completed_at.is_not(None),
            Workout.date >= start_date,
            Workout.date < end_date,
        )
        .order_by(Workout.date.asc())
        .all()
    )


def get_progress_exercise_names(db: Session, user_id: int) -> list[str]:
    normalized_name = func.lower(func.trim(Exercise.name))

    rows = (
        db.query(normalized_name.label("name"))
        .select_from(Exercise)
        .join(
            Workout,
            Exercise.workout_id == Workout.id,
        )
        .join(
            WorkoutSet,
            WorkoutSet.exercise_id == Exercise.id,
        )
        .filter(
            Workout.user_id == user_id,
            Workout.completed_at.is_not(None),
            WorkoutSet.weight > 0,
        )
        .distinct()
        .order_by(normalized_name.asc())
        .all()
    )

    return [row.name for row in rows]


def get_completed_sets_for_exercise_period(
    db: Session,
    user_id: int,
    exercise_name: str,
    start_date: datetime,
    end_date: datetime
):
    normanized_name = func.lower(func.trim(Exercise.name))

    return (
        db.query(
            Workout.date.label("workout_date"),
            Exercise.name.label("exercise_name"),
            WorkoutSet.weight.label("weight"),
            WorkoutSet.reps.label("reps"),
        )
        .select_from(WorkoutSet)
        .join(
            Exercise,
            WorkoutSet.exercise_id == Exercise.id,
        )
        .join(
            Workout,
            Exercise.workout_id == Workout.id,
        )
        .filter(
            Workout.user_id == user_id,
            Workout.completed_at.is_not(None),
            Workout.date >= start_date,
            Workout.date < end_date,
            WorkoutSet.weight > 0,
            normanized_name == exercise_name,
        )
        .order_by(
            Workout.date.asc(),
            WorkoutSet.id.asc(),
        )
        .all()
    )


def get_completed_weighted_sets(db: Session, user_id: int):
    return (
        db.query(
            Workout.date.label("workout_date"),
            Exercise.name.label("exercise_name"),
            WorkoutSet.weight.label("weight"),
            WorkoutSet.reps.label("reps"),
        )
        .select_from(WorkoutSet)
        .join(
            Exercise,
            WorkoutSet.exercise_id == Exercise.id,
        )
        .join(
            Workout,
            Exercise.workout_id == Workout.id,
        )
        .filter(
            Workout.user_id == user_id,
            Workout.completed_at.is_not(None),
            WorkoutSet.weight > 0,
        )
        .order_by(
            Workout.date.desc(),
            WorkoutSet.id.desc(),
        )
        .all()
    )