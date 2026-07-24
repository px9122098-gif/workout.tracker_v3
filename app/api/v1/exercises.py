from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas import ExerciseResponse, CreateExerciseRequest, UpdateExerciseRequest
from app.dependency import get_current_user, get_db
from app.service import exercises as exercises_service
from app.models import User

router = APIRouter()

@router.post("/exercises", response_model=ExerciseResponse)
def create_exercise(exercise_data: CreateExerciseRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return exercises_service.create_exercise(db, exercise_data, current_user)


@router.patch("/exercises/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(exercise_id: int, exercise_data: UpdateExerciseRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return exercises_service.update_exercise(db, exercise_id, exercise_data.name, current_user)


@router.delete("/exercises/{exercise_id}")
def delete_exercise_by_id(exercise_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return exercises_service.delete_exercise_by_id(db, exercise_id, current_user)