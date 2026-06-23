from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

def _sqlite_url() -> str:
    db_path = Path(__file__).resolve().parents[2] / "edusummarizer.db"
    return f"sqlite:///{db_path}"

def get_engine():
    return engine

def _create_engine():
    url = settings.DATABASE_URL or _sqlite_url()
    try:
        engine = create_engine(
            url,
            echo=False,
            pool_pre_ping=True,
        )
        with engine.connect():
            pass
        return engine
    except Exception:
        fallback_engine = create_engine(
            _sqlite_url(),
            echo=False,
            connect_args={"check_same_thread": False},
        )
        return fallback_engine


engine = _create_engine()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()
