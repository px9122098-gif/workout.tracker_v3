from datetime import datetime
from sqlalchemy.orm import Session, selectinload
from app.models import Workout, Exercise


def is_workout_exist_for_user(db: Session, workout_title: str, user_id: int) -> bool:
    return db.query(Workout).filter(Workout.title == workout_title, Workout.user_id == user_id).first() is not None


def create_workout(db: Session, title: str, notes: str, user_id: int) -> Workout:
    workout = Workout(title=title, notes=notes, user_id=user_id)
    db.add(workout)
    db.flush()
    return workout


def update_workout(db: Session, workout: Workout, changes: dict) -> Workout:
    for field, value in changes.items():
        setattr(workout, field, value)
    db.flush()
    return workout


def get_workout_by_id_for_user(db: Session, workout_id: int, user_id: int):
    return db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == user_id).first()


def get_workouts_overview_data(db: Session, user_id: int, start_date: datetime, end_date: datetime):
    return (
        db.query(Workout)
        .options(
            selectinload(Workout.exercises)
            .selectinload(Exercise.sets)
        )
        .filter(
            Workout.user_id == user_id,
            Workout.date >= start_date,
            Workout.date < end_date,
        )
        .order_by(Workout.date.desc())
        .all()
    )
    

def delete_workout_by_id(db: Session, workout_id: int, user_id: int):
    workout = get_workout_by_id_for_user(db, workout_id, user_id)
    if workout is not None:
        db.delete(workout)


def get_workouts_by_user(db: Session, user_id: int):
    return db.query(Workout).filter(Workout.user_id == user_id).all()


