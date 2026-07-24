from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models import User
from app.repository import sets as sets_repository
from app.schemas import CreateSetRequest, UpdateSetRequest, WorkoutSetResponse
from app.repository import exercises as exercises_repository


def create_set(db: Session, set_data: CreateSetRequest, current_user: User) -> WorkoutSetResponse:
    exercise = exercises_repository.get_exercise_by_id_for_user(db, set_data.exercise_id, current_user.id)
    if not exercise:
        raise HTTPException(
            status_code=404,
            detail=f"Exercise not found",
        )

    set = sets_repository.create_set(db, set_data.exercise_id, set_data.reps, set_data.weight)

    db.commit()
    db.refresh(set)

    return WorkoutSetResponse.model_validate(set)


def update_set(db: Session, set_id: int, set_data: UpdateSetRequest, current_user: User) -> WorkoutSetResponse:
    workout_set = sets_repository.get_set_by_id_for_user(db, set_id, current_user.id)
    if not workout_set:
        raise HTTPException(
            status_code=404,
            detail=f"Set not found",
        )
    else:
        updated_set = sets_repository.update_set(db, workout_set, set_data.reps, set_data.weight)

    db.commit()
    db.refresh(updated_set)
    return WorkoutSetResponse.model_validate(updated_set)


def delete_set_by_id(db: Session, set_id: int, current_user: User):
    workout_set = sets_repository.get_set_by_id_for_user(db, set_id, current_user.id)
    if not workout_set:
        raise HTTPException(
            status_code=404,
            detail=f"Set not found",
        )
    else:
        sets_repository.delete_set_by_id(db, workout_set)
    
    db.commit()
    return {"message": "Set deleted successfully"}

