from pydantic import BaseModel, ConfigDict, Field, field_validator
from decimal import Decimal
from datetime import date, datetime

from app.enums import WorkoutEffort


class RegisterRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: str = Field(..., max_length=255)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CreateWorkoutRequest(BaseModel):
    title: str = Field(..., max_length=127)
    notes: str | None = Field(default=None, max_length=500)


class UpdateWorkoutRequest(BaseModel):
    notes: str | None = Field(default=None, max_length=500)
    effort_level: WorkoutEffort | None = None


class CompleteWorkoutRequest(BaseModel):
    effort_level: WorkoutEffort | None = None


class WorkoutResponse(BaseModel):
    id: int
    title: str = Field(..., max_length=127)
    date: datetime
    completed_at: datetime | None = None
    notes: str | None = None
    effort_level: WorkoutEffort | None = None

    model_config = ConfigDict(from_attributes=True)


class WorkoutOverviewItem(BaseModel):
    id: int
    title: str
    date: datetime
    completed_at: datetime | None = None
    notes: str | None
    effort_level: WorkoutEffort | None
    exercise_count: int
    set_count: int
    volume: Decimal


class WorkoutActivityItem(BaseModel):
    day: int
    workouts: int
    effort_level: WorkoutEffort | None


class WorkoutOverviewSummary(BaseModel):
    workouts: int
    exercises: int
    sets: int
    volume: Decimal
    strongest_week: int
    most_trained: str | None


class WorkoutOverviewResponse(BaseModel):
    year: int
    month: int
    summary: WorkoutOverviewSummary
    activity: list[WorkoutActivityItem]
    workouts: list[WorkoutOverviewItem]


class CreateExerciseRequest(BaseModel):
    workout_id: int
    name: str = Field(..., max_length=127)

    @field_validator("name")
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Exercise name cannot be empty")
        return v
    

class UpdateExerciseRequest(BaseModel):
    name: str = Field(..., max_length=127)

    @field_validator("name")
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Exercise name cannot be empty")
        return v


class ExerciseResponse(BaseModel):
    id: int
    workout_id: int
    name: str = Field(..., max_length=127)

    model_config = ConfigDict(from_attributes=True)


class CreateSetRequest(BaseModel):
    exercise_id: int
    weight: Decimal
    reps: int

    @field_validator('reps')
    def reps_not_negative(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Reps must be positive")
        return v

    @field_validator('weight')
    def weight_not_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Weight cannot be negative")
        return v


class UpdateSetRequest(BaseModel):
    weight: Decimal
    reps: int

    @field_validator('reps')
    def reps_not_negative(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Reps must be positive")
        return v

    @field_validator('weight')
    def weight_not_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Weight cannot be negative")
        return v


class WorkoutSetResponse(BaseModel):
    id: int
    exercise_id: int
    weight: Decimal
    reps: int

    model_config = ConfigDict(from_attributes=True)


class ExerciseWithSetsResponse(BaseModel):
    id: int
    name: str = Field(..., max_length=127)
    sets: list[WorkoutSetResponse]

    model_config = ConfigDict(from_attributes=True)


class WorkoutDetailResponse(BaseModel):
    id: int
    title: str = Field(..., max_length=127)
    date: datetime
    completed_at: datetime | None = None
    exercises: list[ExerciseWithSetsResponse]
    notes: str | None = None
    effort_level: WorkoutEffort | None = None

    model_config = ConfigDict(from_attributes=True)


class ProgressPeriodResponse(BaseModel):
    months: int
    start_date: date
    end_date: date


class ProgressSummaryResponse(BaseModel):
    workouts: int
    volume: Decimal
    previous_volume: Decimal
    volume_change_percent: Decimal | None = None


class WeeklyVolumeItem(BaseModel):
    week_start: date
    workouts: int
    volume: Decimal


class ExerciseProgressOptionResponse(BaseModel):
    name: str


class StrengthProgressPointResponse(BaseModel):
    date: date
    weight: Decimal
    reps: int
    estimated_1rm: Decimal


class StrengthProgressResponse(BaseModel):
    exercise_name: str
    current_estimated_1rm: Decimal | None
    change_percent: Decimal | None
    points: list[StrengthProgressPointResponse]


class ProgressConsistencyDayResponse(BaseModel):
    date: date
    workouts: int
    effort_level: WorkoutEffort | None = None


class ProgressConsistencyResponse(BaseModel):
    active_days: int
    active_weeks: int 
    current_week_streak: int 
    best_week_streak: int 
    days: list[ProgressConsistencyDayResponse]


class ProgressOverviewResponse(BaseModel):
    period: ProgressPeriodResponse
    summary: ProgressSummaryResponse
    weekly_volume: list[WeeklyVolumeItem]
    consistency: ProgressConsistencyResponse


class PersonalRecordItemResponse(BaseModel):
    exercise_name: str
    weight: Decimal
    reps: int
    estimated_1rm: Decimal
    workout_date: date

