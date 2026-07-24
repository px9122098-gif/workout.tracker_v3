from sqlalchemy.orm import Session
from app.models import Workout, Exercise, WorkoutSet


def create_set(db: Session, exercise_id: int, reps: int, weight: float) -> WorkoutSet:
    workout_set = WorkoutSet(exercise_id=exercise_id, reps=reps, weight=weight)
    db.add(workout_set)
    db.flush()
    return workout_set


def update_set(db: Session, workout_set: WorkoutSet, reps: int, weight: float) -> WorkoutSet:
    workout_set.reps = reps
    workout_set.weight = weight
    db.flush()
    return workout_set


def get_set_by_id_for_user(db: Session, set_id: int, user_id: int):
    return db.query(WorkoutSet).join(Exercise).join(Workout).filter(WorkoutSet.id == set_id, Workout.user_id == user_id).first()


def delete_set_by_id(db: Session, workout_set: WorkoutSet):
    db.delete(workout_set)
