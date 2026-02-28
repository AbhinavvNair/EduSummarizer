from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to notes
    notes = relationship(
        "Note",
        back_populates="owner",
        cascade="all, delete-orphan"
    )
    flashcard_decks = relationship(
        "FlashcardDeck",
        back_populates="owner",
        cascade="all, delete-orphan"
    
    )


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    is_bookmarked = Column(Boolean, nullable=False, default=False)

    owner = relationship("User", back_populates="notes")

class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    count = Column(Integer, nullable=False)
    cards = Column(JSON, nullable=False)
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="flashcard_decks")