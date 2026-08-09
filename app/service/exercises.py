from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import User
from app.schemas import CreateExerciseRequest, ExerciseResponse
from app.repository import exercises as exercises_repository
from app.repository import workouts as workouts_repository
from app.service.workouts import ensure_workout_is_editable


def create_exercise(db: Session, exercise_data: CreateExerciseRequest, current_user: User) -> ExerciseResponse:
    name = exercise_data.name.strip()

    workout = workouts_repository.get_workout_by_id_for_user(db, exercise_data.workout_id, current_user.id)
    if not workout:
        raise HTTPException(
            status_code=404,
            detail=f"Workout with ID '{exercise_data.workout_id}' not found",
        )

    ensure_workout_is_editable(workout)
    
    if exercises_repository.is_exercise_exist(db, exercise_data.workout_id, name):
        raise HTTPException(
            status_code=400,
            detail=f"Exercise '{exercise_data.name}' already exists",
        )

    exercise = exercises_repository.create_exercise(db, name, exercise_data.workout_id)

    db.commit()
    db.refresh(exercise)

    return ExerciseResponse.model_validate(exercise)


def update_exercise(db: Session, exercise_id: int, new_name: str, current_user: User) -> ExerciseResponse:
    exercise = exercises_repository.get_exercise_by_id_for_user(db, exercise_id, current_user.id)
    if not exercise:
        raise HTTPException(
            status_code=404,
            detail="Exercise not found"
        )
    ensure_workout_is_editable(exercise.workout)
    
    if new_name != exercise.name:
        if exercises_repository.is_exercise_exist(db, exercise.workout_id, new_name):
            raise HTTPException(
                status_code=400,
                detail="Exercise with this name already exist"
            )

    updated_exercise = exercises_repository.update_exercise(db, exercise, new_name)
    db.commit()
    db.refresh(updated_exercise)

    return ExerciseResponse.model_validate(updated_exercise)


def delete_exercise_by_id(db: Session, exercise_id: int, current_user: User):
    exercise = exercises_repository.get_exercise_by_id_for_user(db, exercise_id, current_user.id)
    if not exercise:
        raise HTTPException(
            status_code=404,
            detail="Exercise not found"
        )

    ensure_workout_is_editable(exercise.workout)
    exercises_repository.delete_exercise_by_id(db, exercise)

    db.commit()
    return {"message": "Exercise deleted successfully"}
