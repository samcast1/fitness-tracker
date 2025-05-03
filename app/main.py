from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, Column, Integer, String, Float, Date, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from typing import List, Optional
import os
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Fitness Tracker")

# Database setup with retry logic
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://fitness:fitness@db:5432/fitness_tracker")

# Retry connection to database
MAX_RETRIES = 5
for attempt in range(MAX_RETRIES):
    try:
        logger.info(f"Attempting to connect to database (attempt {attempt+1}/{MAX_RETRIES})...")
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        engine.connect()
        logger.info("Successfully connected to database!")
        break
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        if attempt < MAX_RETRIES - 1:
            wait_time = 2 ** attempt  # Exponential backoff
            logger.info(f"Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
        else:
            logger.error("Max retries reached. Could not connect to database.")
            # We'll continue and let the app start, but database operations will fail


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Workout(Base):
    __tablename__ = "workouts"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date)
    name = Column(String, index=True)
    duration = Column(Integer)  # in minutes
    calories_burned = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)

class Exercise(Base):
    __tablename__ = "exercises"
    
    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"))
    name = Column(String, index=True)
    sets = Column(Integer, nullable=True)
    reps = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)  # in kg
    duration = Column(Integer, nullable=True)  # in seconds
    notes = Column(String, nullable=True)

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
    duration: int  # in minutes
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
    exercises: List[ExerciseLog] = []

# Create tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully!")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")

# Dependencies
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Mount static files
try:
    app.mount("/static", StaticFiles(directory="app/static"), name="static")
    templates = Jinja2Templates(directory="app/templates")
except Exception as e:
    logger.error(f"Failed to mount static files: {e}")
    # Create minimal templates directory
    os.makedirs("app/templates", exist_ok=True)
    templates = Jinja2Templates(directory="app/templates")

AVAILABLE_EXERCISES = {
    "strength": [
        {"id": "bench", "name": "Bench Press", "type": "strength", "needs_reps": True},
        {"id": "squat", "name": "Squat", "type": "strength", "needs_reps": True},
        {"id": "deadlift", "name": "Deadlift", "type": "strength", "needs_reps": True},
        {"id": "barbell_row", "name": "Barbell Row", "type": "strength", "needs_reps": True},
        {"id": "pullup", "name": "Pull-up", "type": "strength", "needs_reps": True},
        {"id": "pushup", "name": "Push-up", "type": "strength", "needs_reps": True},
        {"id": "body_squat", "name": "Bodyweight Squat", "type": "strength", "needs_reps": True}
    ],
    "conditioning": [
        {"id": "run", "name": "Running", "type": "conditioning", "needs_distance": True}
    ]
}

async def get_weekly_stats(db: Session):
    """Get workout statistics for the past week"""
    week_ago = datetime.now() - timedelta(days=7)
    
    # Get workout count
    workout_count = db.query(Workout).filter(
        Workout.date >= week_ago
    ).count()
    
    # Get total active minutes
    active_minutes = db.query(func.sum(Workout.duration)).filter(
        Workout.date >= week_ago
    ).scalar() or 0
    
    # Get total calories burned
    calories_burned = db.query(func.sum(Workout.calories_burned)).filter(
        Workout.date >= week_ago
    ).scalar() or 0
    
    # Get recent workouts
    recent_workouts = db.query(Workout).order_by(
        Workout.date.desc()
    ).limit(3).all()
    
    return {
        "workout_count": workout_count,
        "active_minutes": active_minutes,
        "calories_burned": calories_burned,
        "recent_workouts": recent_workouts
    }


@app.get("/api/exercises/available")
async def get_available_exercises():
    """Get list of available exercises"""
    return AVAILABLE_EXERCISES

@app.get("/", response_class=HTMLResponse)
async def home(request: Request, db: Session = Depends(get_db)):
    stats = await get_weekly_stats(db)
    
    return templates.TemplateResponse("index.html", {
        "request": request,
        "title": "Fitness Tracker",
        "stats": stats,
        "today": datetime.now(),
        "datetime": datetime,
        "timedelta": timedelta,
    })

@app.get("/api/health")
async def health_check():
    try:
        # Try to connect to the database
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/workout", response_class=HTMLResponse)
async def workout_page(request: Request):
    """Render the workout session page for mobile use"""
    return templates.TemplateResponse("workout.html", {"request": request, "title": "Workout Session"})

@app.post("/api/workouts/")
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

@app.get("/api/workouts/")
async def get_workouts(db: Session = Depends(get_db)):
    """Get all workouts"""
    workouts = db.query(Workout).order_by(Workout.date.desc()).all()
    return workouts

@app.post("/api/workouts/{workout_id}/exercises/")
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

@app.post("/api/workouts/start")
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

@app.put("/api/workouts/{workout_id}/end")
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


@app.get("/new-workout", response_class=HTMLResponse)
async def new_workout_page(request: Request):
    """Render the new workout page"""
    return templates.TemplateResponse("new_workout.html", {"request": request, "title": "New Workout"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)