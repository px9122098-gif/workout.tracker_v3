from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.service import sets as sets_service
from app.dependency import get_db, get_current_user
from app.schemas import CreateSetRequest, WorkoutSetResponse, UpdateSetRequest
from app.models import User

router = APIRouter()

@router.post("/sets", response_model=WorkoutSetResponse)
def create_set(set_data: CreateSetRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return sets_service.create_set(db, set_data, current_user)


@router.patch("/sets/{set_id}", response_model=WorkoutSetResponse)
def update_set(set_id: int, set_data: UpdateSetRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return sets_service.update_set(db, set_id, set_data, current_user)
    

@router.delete("/sets/{set_id}")
def delete_set_by_id(set_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return sets_service.delete_set_by_id(db, set_id, current_user)


