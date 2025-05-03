from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.database import Workout, Exercise
from app.models.schemas import WorkoutLog, ExerciseLog
from app.api.utils.constants import AVAILABLE_EXERCISES

router = APIRouter()

@router.get("/api/exercises/available")
async def get_available_exercises():
    """Get list of available exercises"""
    return AVAILABLE_EXERCISES


@router.post("/start")
async def start_workout(workout: WorkoutLog, db: Session = Depends(get_db)):
    """Start a new workout session"""
    db_workout = Workout(
        date=workout.date,
        name=workout.name,
        duration=0,
        calories_burned=0
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return {"workout_id": db_workout.id}

@router.post("/api/workouts/")
async def create_workout(workout: WorkoutLog, db: Session = Depends(get_db)):
    """Create a new workout log"""
    db_workout = Workout(
        date=workout.date,
        name=workout.name,
        duration=workout.duration,
        calories_burned=workout.calories_burned,
        notes=workout.notes
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    
    # Add exercises
    for exercise in workout.exercises:
        db_exercise = Exercise(
            workout_id=db_workout.id,
            name=exercise.name,
            sets=exercise.sets,
            reps=exercise.reps,
            weight=exercise.weight,
            duration=exercise.duration,
            notes=exercise.notes
        )
        db.add(db_exercise)
    
    db.commit()
    return {"id": db_workout.id, "status": "workout logged"}

@router.get("/api/workouts/")
async def get_workouts(db: Session = Depends(get_db)):
    """Get all workouts"""
    workouts = db.query(Workout).order_by(Workout.date.desc()).all()
    return workouts

@router.post("/api/workouts/{workout_id}/exercises/")
async def log_exercise(
    workout_id: int,
    exercise: ExerciseLog,
    db: Session = Depends(get_db)
):
    """Log a single exercise during a workout"""
    db_exercise = Exercise(
        workout_id=workout_id,
        name=exercise.name,
        sets=exercise.sets,
        reps=exercise.reps,
        weight=exercise.weight,
        duration=exercise.duration,
        notes=exercise.notes
    )
    db.add(db_exercise)
    db.commit()
    return {"status": "exercise logged"}

@router.post("/api/workouts/start")
async def start_workout(
    workout: WorkoutLog,
    db: Session = Depends(get_db)
):
    """Start a new workout session"""
    db_workout = Workout(
        date=workout.date,
        name=workout.name,
        duration=0,  # Will be updated when workout ends
        calories_burned=0  # Will be updated when workout ends
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)
    return {"workout_id": db_workout.id}

@router.put("/api/workouts/{workout_id}/end")
async def end_workout(
    workout_id: int,
    workout: WorkoutLog,
    db: Session = Depends(get_db)
):
    """End a workout session and update final stats"""
    db_workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    
    db_workout.duration = workout.duration
    db_workout.calories_burned = workout.calories_burned
    db_workout.notes = workout.notes
    
    db.commit()
    return {"status": "workout completed"}
