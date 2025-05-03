from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.database import Workout

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
