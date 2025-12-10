"""
Database connection and session management for SQLite.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

# Database file path
DATABASE_DIR = os.path.join(os.path.dirname(__file__), "data")
DATABASE_FILE = os.path.join(DATABASE_DIR, "csv_data.db")
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

# Create data directory if it doesn't exist
os.makedirs(DATABASE_DIR, exist_ok=True)

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    echo=False,  # Set to True for SQL query logging
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def init_db():
    """Initialize database - create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database sessions.
    
    Usage in FastAPI:
        @router.get("/endpoint")
        async def endpoint(db: Session = Depends(get_db)):
            # use db session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
