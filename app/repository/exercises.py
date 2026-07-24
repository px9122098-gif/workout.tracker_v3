from sqlalchemy.orm import Session

from app.models import Exercise, Workout

def is_exercise_exist(db: Session, workout_id: int, exercise_name: str) -> bool:
    return db.query(Exercise).filter(Exercise.workout_id == workout_id, Exercise.name == exercise_name).first() is not None


def create_exercise(db: Session, name: str, workout_id: int) -> Exercise:
    exercise = Exercise(name=name, workout_id=workout_id)
    db.add(exercise)
    db.flush()
    return exercise


def get_exercise_by_id_for_user(db: Session, exercise_id: int, user_id: int):
    return db.query(Exercise).join(Workout).filter(Exercise.id == exercise_id, Workout.user_id == user_id).first()


def update_exercise(db: Session, exercise: Exercise, name: str):
    exercise.name = name
    db.flush()
    return exercise


def delete_exercise_by_id(db: Session, exercise: Exercise):
    db.delete(exercise)
