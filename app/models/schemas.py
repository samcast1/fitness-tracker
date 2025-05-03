from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

class ExerciseLog(BaseModel):
    workout_id: int
    name: str
    sets: int
    reps: int
    weight: Optional[float] = None
    duration: Optional[int] = None
    notes: Optional[str] = None

class WorkoutLog(BaseModel):
    date: datetime = date.today()
    name: str
    duration: int
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
    exercises: List[ExerciseLog] = []