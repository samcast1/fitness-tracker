from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import logging
import time
from .config import settings

logger = logging.getLogger(__name__)

# Database setup with retry logic
engine = None
for attempt in range(settings.MAX_RETRIES):
    try:
        logger.info(f"Attempting to connect to database (attempt {attempt+1}/{settings.MAX_RETRIES})...")
        engine = create_engine(settings.DATABASE_URL)
        engine.connect()
        logger.info("Successfully connected to database!")
        break
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        if attempt < settings.MAX_RETRIES - 1:
            wait_time = 2 ** attempt
            logger.info(f"Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
        else:
            logger.error("Max retries reached. Could not connect to database.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()