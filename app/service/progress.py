from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.models import User, Workout
from app.repository import progress as progress_repository
from app.schemas import (
    ExerciseProgressOptionResponse,
    StrengthProgressPointResponse,
    StrengthProgressResponse,
    ProgressConsistencyDayResponse,
    ProgressConsistencyResponse,
    ProgressOverviewResponse,
    PersonalRecordItemResponse,
)


EFFORT_RANK = {
    None: 0,
    "light": 1,
    "moderate": 2,
    "hard": 3,
    "very_hard": 4,
}


def shift_months(value: datetime, months: int) -> datetime:
    month_number = value.year * 12 + value.month - 1 + months
    year, month_index = divmod(month_number, 12)
    return datetime(year, month_index + 1, 1)


def calculate_workout_volume(workout: Workout) -> Decimal:
    volume = Decimal("0")

    for exercise in workout.exercises:
        for workout_set in exercise.sets:
            volume += workout_set.weight * workout_set.reps

    return volume


def get_progress_overview(
    db: Session,
    current_user: User,
    months: int
) -> ProgressOverviewResponse:
    now = datetime.now()
    current_month_start = datetime(now.year, now.month, 1)

    current_end = shift_months(current_month_start, 1)
    current_start = shift_months(current_end, -months)
    previous_start = shift_months(current_start, -months)

    first_period_date = current_start.date()
    last_period_date = (current_end - timedelta(days=1)).date()

    first_week_start = first_period_date - timedelta(days=first_period_date.weekday())
    last_week_start = last_period_date - timedelta(days=last_period_date.weekday())

    weekly_data = {}
    cursor = first_week_start

    while cursor <= last_week_start:
        weekly_data[cursor] = {
            "workouts": 0,
            "volume": Decimal("0"),
        }

        cursor += timedelta(days=7)
    
    workouts = progress_repository.get_completed_workouts_for_period(
        db,
        current_user.id,
        previous_start,
        current_end,
    )

    previous_workouts = [
        workout for workout in workouts
        if workout.date < current_start
    ]

    current_workouts = [
        workout for workout in workouts
        if workout.date >= current_start
    ]

    today = now.date()

    current_week_start = (
        today - timedelta(days=today.weekday())
    )

    consistency = calculate_consistency(current_workouts, current_week_start)

    previous_volume = Decimal("0")
    for workout in previous_workouts:
        previous_volume += calculate_workout_volume(workout)

    current_volume = Decimal("0")
    for workout in current_workouts:
        current_volume += calculate_workout_volume(workout)

    if previous_volume == 0:
        change_percent = None
    else:
        change_percent = (
            (current_volume - previous_volume)
            / previous_volume
            * Decimal("100")
        ).quantize(Decimal("0.01"))

    for workout in current_workouts:
        week_start = (
            workout.date.date()
            - timedelta(days=workout.date.weekday())
        )

        week = weekly_data[week_start]

        week["workouts"] += 1
        week["volume"] += calculate_workout_volume(workout)

    weekly_volume = [
        {
            "week_start": week_start,
            "workouts": values["workouts"],
            "volume": values["volume"],
        }
        for week_start, values in sorted(weekly_data.items())
    ]

    return ProgressOverviewResponse(
        period={
            "months": months,
            "start_date": current_start.date(),
            "end_date": (
                current_end - timedelta(days=1)
            ).date(),
        },
        summary={
            "workouts": len(current_workouts),
            "volume": current_volume,
            "previous_volume": previous_volume,
            "volume_change_percent": change_percent,
        },
        weekly_volume=weekly_volume,
        consistency=consistency,
    )

        
def calculate_estimated_1rm(weight: Decimal, reps: int) -> Decimal:
    if weight <= 0 or reps <= 0:
        return Decimal("0")

    result = weight * (
        Decimal("1")
        + Decimal(reps) / Decimal("30")
    )

    return result.quantize(Decimal("0.01"))


def get_progress_exercise_options(
    db: Session,
    current_user: User
) -> list[ExerciseProgressOptionResponse]:
    names = progress_repository.get_progress_exercise_names(db, current_user.id)

    return [
        ExerciseProgressOptionResponse(
            name=name.title(),
        )
        for name in names
    ]


def get_strength_progress(
    db: Session,
    current_user: User,
    exercise_name: str,
    months: int,
) -> StrengthProgressResponse:
    clean_name = exercise_name.strip()

    if not clean_name:
        raise HTTPException(
            status_code=422,
            detail="Exercise name cannot be empty",
        )

    normalized_name = clean_name.lower()

    now = datetime.now()
    current_month_start = datetime(
        now.year,
        now.month,
        1,
    )
    current_end = shift_months(current_month_start, 1)
    current_start = shift_months(current_end, -months)

    rows = (
        progress_repository.get_completed_sets_for_exercise_period(
            db,
            current_user.id,
            normalized_name,
            current_start,
            current_end,
        )
    )

    if not rows:
        return StrengthProgressResponse(
            exercise_name=clean_name,
            current_estimated_1rm=None,
            change_percent=None,
            points=[],
        )

    best_points_by_date = {}

    for row in rows:
        estimated_1rm = calculate_estimated_1rm(row.weight, row.reps)
        workout_date = row.workout_date.date()

        current_best = best_points_by_date.get(workout_date)

        if (
            current_best is None
            or estimated_1rm > current_best.estimated_1rm
        ):
            best_points_by_date[workout_date] = (
                StrengthProgressPointResponse(
                    date=workout_date,
                    weight=row.weight,
                    reps=row.reps,
                    estimated_1rm=estimated_1rm,
                )
            )

    points = sorted(
        best_points_by_date.values(),
        key=lambda point: point.date,
    )

    first_value = points[0].estimated_1rm
    current_value = points[-1].estimated_1rm

    if len(points) < 2 or first_value == 0:
        change_percent = None
    else:
        change_percent = (
            (current_value - first_value)
            / first_value
            * Decimal("100")
        ).quantize(Decimal("0.01"))

    return StrengthProgressResponse(
        exercise_name=rows[-1].exercise_name.strip(),
        current_estimated_1rm=current_value,
        change_percent=change_percent,
        points=points,
    )


def calculate_consistency(
    workouts: list[Workout],
    current_week_start: date,
) -> ProgressConsistencyResponse:
    days_by_date = {}

    for workout in workouts:
        workout_date = workout.date.date()

        if workout_date not in days_by_date:
            days_by_date[workout_date] = {
                "workouts": 0,
                "effort_level": None,
            }

        day_data = days_by_date[workout_date]
        day_data["workouts"] += 1

        saved_effort = day_data["effort_level"]
        incoming_effort = workout.effort_level

        if (
            EFFORT_RANK.get(incoming_effort, 0)
            > EFFORT_RANK.get(saved_effort, 0)
        ):
            day_data["effort_level"] = incoming_effort

    active_week_starts = {
        workout_date - timedelta(days=workout_date.weekday())
        for workout_date in days_by_date
    }

    sorted_weeks = sorted(active_week_starts)

    best_week_streak = 0
    running_streak = 0
    previous_week = None

    for week_start in sorted_weeks:
        is_consecutive = (
            previous_week is not None
            and week_start - previous_week == timedelta(days=7)
        )

        if is_consecutive:
            running_streak += 1
        else:
            running_streak = 1

        best_week_streak = max(
            best_week_streak,
            running_streak,
        )
        previous_week = week_start

    streak_cursor = current_week_start

    if streak_cursor not in active_week_starts:
        streak_cursor -= timedelta(days=7)

    current_week_streak = 0

    while streak_cursor in active_week_starts:
        current_week_streak += 1
        streak_cursor -= timedelta(days=7)

    days = [
        ProgressConsistencyDayResponse(
            date=workout_date,
            workouts=day_data["workouts"],
            effort_level=day_data["effort_level"],
        )
        for workout_date, day_data
        in sorted(days_by_date.items())
    ]

    return ProgressConsistencyResponse(
        active_days=len(days_by_date),
        active_weeks=len(active_week_starts),
        current_week_streak=current_week_streak,
        best_week_streak=best_week_streak,
        days=days,
    )


def get_personal_records(
    db: Session,
    current_user: User,
    limit: int
) -> list[PersonalRecordItemResponse]:
    rows = progress_repository.get_completed_weighted_sets(db, current_user.id)

    best_by_exercise: dict[str, PersonalRecordItemResponse] = {}

    for row in rows:
        normalized_name = row.exercise_name.strip().lower()
        estimated_1rm = calculate_estimated_1rm(row.weight, row.reps)
    
        candidate = PersonalRecordItemResponse(
            exercise_name=row.exercise_name.strip().title(),
            weight=row.weight,
            reps=row.reps,
            estimated_1rm=estimated_1rm,
            workout_date=row.workout_date.date(),
        )

        current_best = best_by_exercise.get(normalized_name)

        should_replace = (
            current_best is None
            or candidate.estimated_1rm > current_best.estimated_1rm
            or (
                candidate.estimated_1rm == current_best.estimated_1rm
                and candidate.workout_date > current_best.workout_date
            )
        )

        if should_replace:
            best_by_exercise[normalized_name] = candidate

    records = sorted(
        best_by_exercise.values(),
        key=lambda record: (
            record.workout_date,
            record.estimated_1rm,
        ),
        reverse=True,
    )

    return records[:limit]
            



