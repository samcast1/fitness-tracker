import os

class Settings:
    PROJECT_NAME: str = "Fitness Tracker"
    VERSION: str = "1.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://fitness:fitness@db:5432/fitness_tracker")
    MAX_RETRIES: int = 5

settings = Settings()