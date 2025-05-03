from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from fastapi.responses import HTMLResponse
from datetime import datetime, timedelta
import logging
import os
from app.core.database import Base, engine, get_db, SessionLocal
from app.api.endpoints.workouts import router as workouts_router
from app.api.utils.helpers import get_weekly_stats

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Fitness Tracker")

# Create tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully!")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")

# Mount static files
try:
    app.mount("/static", StaticFiles(directory="app/static"), name="static")
    templates = Jinja2Templates(directory="app/templates")
except Exception as e:
    logger.error(f"Failed to mount static files: {e}")
    # Create minimal templates directory
    os.makedirs("app/templates", exist_ok=True)
    templates = Jinja2Templates(directory="app/templates")

app.include_router(workouts_router, prefix="/api/workouts", tags=["workouts"])

@app.get("/api/health")
async def health_check():
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


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

@app.get("/workout", response_class=HTMLResponse)
async def workout_page(request: Request):
    """Render the workout session page for mobile use"""
    return templates.TemplateResponse("workout.html", {"request": request, "title": "Workout Session"})

@app.get("/new-workout", response_class=HTMLResponse)
async def new_workout_page(request: Request):
    """Render the new workout page"""
    return templates.TemplateResponse("new_workout.html", {"request": request, "title": "New Workout"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)