from enum import Enum


class WorkoutEffort(str, Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    HARD = "hard"
    VERY_HARD = "very_hard"
