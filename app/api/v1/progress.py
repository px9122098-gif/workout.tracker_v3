from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependency import get_current_user, get_db
from app.models import User
from app.schemas import ProgressOverviewResponse, ExerciseProgressOptionResponse, StrengthProgressResponse
from app.service import progress as progress_service


router = APIRouter()


@router.get("/progress/overview", response_model=ProgressOverviewResponse)
def get_workouts_overview(
    months: int = Query(default=6),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if months not in {3, 6, 12}:
        raise HTTPException(
            status_code=422,
            detail="Months must be 3, 6, or 12",
        )
    return progress_service.get_progress_overview(db, current_user, months)


@router.get(
    "/progress/exercises",
    response_model=list[ExerciseProgressOptionResponse],
)
def get_progress_exercises(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return progress_service.get_progress_exercise_options(db, current_user)


@router.get(
    "/progress/strength",
    response_model=StrengthProgressResponse,
)
def get_strength_progress(
    exercise_name: str = Query(
        ...,
        min_length=1,
        max_length=127,
    ),
    months: int = Query(default=6),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if months not in {3, 6, 12}:
        raise HTTPException(
            status_code=422,
            detail="Months must be 3, 6, or 12",
        )

    return progress_service.get_strength_progress(
        db,
        current_user,
        exercise_name,
        months,
    )

