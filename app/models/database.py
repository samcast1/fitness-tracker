from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from app.core.database import Base

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