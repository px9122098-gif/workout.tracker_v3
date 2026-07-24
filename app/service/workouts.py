from collections import Counter
from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.schemas import CreateWorkoutRequest, UpdateWorkoutRequest, CompleteWorkoutRequest, WorkoutResponse
from app.repository import workouts as workouts_repository
from app.models import User

def create_workout(db: Session, workout_data: CreateWorkoutRequest, current_user: User) -> WorkoutResponse:
    title = workout_data.title.strip()
    notes = workout_data.notes
    
    if not title:
        raise HTTPException(status_code=400, detail="Workout title cannot be empty")
    
    workout = workouts_repository.create_workout(db, title, notes, current_user.id)

    db.commit()
    db.refresh(workout)

    return WorkoutResponse.model_validate(workout)


def update_workout_by_id(db: Session, workout_id: int, workout_data: UpdateWorkoutRequest, current_user: User) -> WorkoutResponse:
    workout = workouts_repository.get_workout_by_id_for_user(db, workout_id, current_user.id)

    if workout is None:
        raise HTTPException(
            status_code=404,
            detail="Workout does not exist"
        )
    
    changes = workout_data.model_dump(exclude_unset=True, mode="json")

    updated_workout = workouts_repository.update_workout(db, workout, changes)
    db.commit()
    db.refresh(updated_workout)

    return WorkoutResponse.model_validate(updated_workout)


def get_all_workouts(db: Session, current_user: User):
    workouts = workouts_repository.get_workouts_by_user(db, current_user.id)
    return [WorkoutResponse.model_validate(workout) for workout in workouts]


def complete_workout(
        db: Session,
        workout_id: int,
        workout_data:
        CompleteWorkoutRequest,
        current_user: User,
    ) -> WorkoutResponse:
    workout = workouts_repository.get_workout_by_id_for_user(db, workout_id, current_user.id)
    if workout is None:
        raise HTTPException(
            status_code=404,
            detail="Workout does not exist"
        )
    
    if workout.completed_at is not None:
        raise HTTPException(
            status_code=409,
            detail="Workout is already completed",
        )
    
    changes = {
        "completed_at": datetime.now(),
    }

    if workout_data.effort_level is not None:
        changes["effort_level"] = workout_data.effort_level.value

    updated_workout = workouts_repository.update_workout(db, workout, changes)
    db.commit()
    db.refresh(updated_workout)
    return WorkoutResponse.model_validate(updated_workout)


def get_workout_by_id(db: Session, workout_id: int, current_user: User):
    workout = workouts_repository.get_workout_by_id_for_user(db, workout_id, current_user.id)
    if workout is None:
        raise HTTPException(
            status_code=404,
            detail="Workout does not exist"
        )
    else:
        return workout


def get_workouts_overview(db: Session, current_user: User, year: int, month: int):
    start_date = datetime(year, month, 1)

    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    workouts = workouts_repository.get_workouts_overview_data(db, current_user.id, start_date, end_date)

    total_exercises = 0
    total_sets = 0
    total_volume = Decimal("0")

    title_counts = Counter()
    week_counts = Counter()

    workout_items = []

    EFFORT_RANK = {
        "light": 1,
        "moderate": 2,
        "hard": 3,
        "very_hard": 4,
    }

    activity_counts = Counter()
    activity_efforts: dict[int, str] = {}

    for workout in workouts:
        exercise_count = len(workout.exercises)
        set_count = 0
        volume = Decimal("0")

        day = workout.date.day
        effort = workout.effort_level

        for exercise in workout.exercises:
            set_count += len(exercise.sets)

            for workout_set in exercise.sets:
                volume += workout_set.weight * workout_set.reps

        total_exercises += exercise_count
        total_sets += set_count
        total_volume += volume

        activity_counts[workout.date.day] += 1
        if effort is not None:
            saved_effort = activity_efforts.get(day)

            if (
                saved_effort is None
                or EFFORT_RANK[effort] > EFFORT_RANK[saved_effort]
            ):
                activity_efforts[day] = effort
        

        title_counts[workout.title.strip().lower()] += 1

        iso_week = workout.date.isocalendar()
        week_counts[(iso_week.year, iso_week.week)] += 1

        workout_items.append({
            "id": workout.id,
            "title": workout.title,
            "date": workout.date,
            "completed_at": workout.completed_at,
            "notes": workout.notes,
            "effort_level": workout.effort_level,
            "exercise_count": exercise_count,
            "set_count": set_count,
            "volume": volume,
        })

    most_trained = (
        title_counts.most_common(1)[0][0]
        if title_counts
        else None
    )

    strongest_week = max(week_counts.values(), default=0)

    return {
        "year": year,
        "month": month,
        "summary": {
            "workouts": len(workouts),
            "exercises": total_exercises,
            "sets": total_sets,
            "volume": total_volume,
            "strongest_week": strongest_week,
            "most_trained": most_trained,
        },
        "activity": [
            {"day": day, "workouts": count, "effort_level": activity_efforts.get(day)}
            for day, count in sorted(activity_counts.items())
        ],
        "workouts": workout_items
    }

def delete_workout_by_id(db: Session, workout_id: int, current_user: User):
    workout = workouts_repository.get_workout_by_id_for_user(db, workout_id, current_user.id)
    if not workout:
        raise HTTPException(
            status_code=404,
            detail=f"Workout not found",
        )
    else:
        workouts_repository.delete_workout_by_id(db, workout_id, current_user.id)
    
    db.commit()
    return {"message": "Workout deleted successfully"}