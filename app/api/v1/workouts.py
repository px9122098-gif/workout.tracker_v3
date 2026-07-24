from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.dependency import get_current_user, get_db
from app.service import workouts as workouts_service
from app.schemas import CreateWorkoutRequest, WorkoutOverviewResponse, WorkoutResponse, WorkoutDetailResponse, UpdateWorkoutRequest, CompleteWorkoutRequest
from app.models import User


router = APIRouter()

@router.post("/workouts", response_model=WorkoutResponse)
def create_workout(workout_data: CreateWorkoutRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return workouts_service.create_workout(db, workout_data, current_user)


@router.get("/workouts", response_model=list[WorkoutResponse])
def get_all_workouts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return workouts_service.get_all_workouts(db, current_user)


@router.get("/workouts/overview", response_model=WorkoutOverviewResponse)
def get_workouts_overview(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return workouts_service.get_workouts_overview(
        db,
        current_user,
        year,
        month,
    )


@router.get("/workouts/{workout_id}", response_model=WorkoutDetailResponse)
def get_workout_by_id(workout_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return workouts_service.get_workout_by_id(db, workout_id, current_user)


@router.patch("/workouts/{workout_id}", response_model=WorkoutResponse)
def update_workout_by_id(workout_id: int, workout_data: UpdateWorkoutRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return workouts_service.update_workout_by_id(db, workout_id, workout_data, current_user)


@router.post("/workouts/{workout_id}/complete", response_model=WorkoutResponse)
def complete_workout(
    workout_id: int,
    workout_data: CompleteWorkoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
    ):
    return workouts_service.complete_workout(db, workout_id, workout_data, current_user)


@router.delete("/workouts/{workout_id}")
def delete_workout_by_id(workout_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return workouts_service.delete_workout_by_id(db, workout_id, current_user)
