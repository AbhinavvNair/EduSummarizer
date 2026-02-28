import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from openai import OpenAI
from dotenv import load_dotenv

from app import models, schemas
from app.dependencies import get_db
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")
model_context = {}


# Lifespan (Groq Client Init)
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔌 Initializing NeuroNotes Pro...")
    if not API_KEY:
        print("❌ ERROR: 'GROQ_API_KEY' not found in .env!")
    else:
        try:
            client = OpenAI(
                api_key=API_KEY,
                base_url="https://api.groq.com/openai/v1",
            )
            model_context["client"] = client
            print("🚀 Groq AI Client successfully initialized!")
        except Exception as e:
            print(f"❌ CRITICAL ERROR: {e}")
    yield
    model_context.clear()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Generate Request Schema
class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 4000
    temperature: float = 0.7

class FlashcardDeckCreate(BaseModel):
    topic: str
    difficulty: str
    cards: list[dict]


class FlashcardDeckResponse(BaseModel):
    id: int
    topic: str
    difficulty: str
    count: int
    cards: list[dict]
    saved_at: str

    model_config = ConfigDict(from_attributes=True)


# AUTH ENDPOINTS

# Register
@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        email=user.email,
        hashed_password=hash_password(user.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# Login
@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    db_user = (
        db.query(models.User)
        .filter(models.User.email == form_data.username)
        .first()
    )

    if not db_user or not verify_password(
        form_data.password,
        db_user.hashed_password,
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": db_user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# Current User
@app.get("/me")
def read_current_user(
    current_user: models.User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": current_user.is_active,
    }


# Change Password
@app.post("/change-password")
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)

    db.commit()
    db.refresh(current_user)

    return {"message": "Password updated successfully"}


# NOTES CRUD (PHASE 2)

# Create Note
@app.post("/notes", response_model=schemas.NoteResponse)
def create_note(
    note: schemas.NoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_note = models.Note(
        title=note.title,
        content=note.content,
        owner_id=current_user.id,
    )

    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return new_note


# Get User Notes
@app.get("/notes", response_model=list[schemas.NoteResponse])
def get_notes(
    saved: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Note)
        .filter(models.Note.owner_id == current_user.id)
    )

    if saved is True:
        query = query.filter(models.Note.is_bookmarked == True)

    notes = query.order_by(models.Note.created_at.desc()).all()

    return notes



# Delete Note
@app.delete("/notes/{note_id}")
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    note = (
        db.query(models.Note)
        .filter(
            models.Note.id == note_id,
            models.Note.owner_id == current_user.id,
        )
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()

    return {"message": "Note deleted successfully"}

# Toggle Bookmark
@app.patch("/notes/{note_id}/bookmark")
def toggle_bookmark(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    note = (
        db.query(models.Note)
        .filter(
            models.Note.id == note_id,
            models.Note.owner_id == current_user.id,
        )
        .first()
    )

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.is_bookmarked = not note.is_bookmarked

    db.commit()
    db.refresh(note)

    return note


# GENERATE (Protected)
@app.post("/generate")
async def generate_text(
    request: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    client = model_context.get("client")
    if not client:
        raise HTTPException(status_code=503, detail="AI Client not initialized.")

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are NeuroNotes Pro. Summarize educational content with clean Markdown, bold key terms, and LaTeX ($$).",
                },
                {"role": "user", "content": request.prompt},
            ],
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        generated_text = completion.choices[0].message.content

        new_note = models.Note(
            title=request.prompt[:50] if request.prompt else "Untitled",
            content=generated_text,
            owner_id=current_user.id,
            is_bookmarked=False,
        )

        db.add(new_note)
        db.commit()
        db.refresh(new_note)

        return {
            "response": generated_text,
            "note_id": new_note.id,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API Error: {str(e)}")

# FLASHCARD DECKS CRUD

# Save a flashcard deck
@app.post("/flashcards", response_model=FlashcardDeckResponse)
def save_flashcard_deck(
    deck: FlashcardDeckCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_deck = models.FlashcardDeck(
        topic=deck.topic,
        difficulty=deck.difficulty,
        count=len(deck.cards),
        cards=deck.cards,
        owner_id=current_user.id,
    )
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    return FlashcardDeckResponse(
        id=new_deck.id,
        topic=new_deck.topic,
        difficulty=new_deck.difficulty,
        count=new_deck.count,
        cards=new_deck.cards,
        saved_at=new_deck.saved_at.isoformat(),
    )


# Get all flashcard decks for current user
@app.get("/flashcards", response_model=list[FlashcardDeckResponse])
def get_flashcard_decks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    decks = (
        db.query(models.FlashcardDeck)
        .filter(models.FlashcardDeck.owner_id == current_user.id)
        .order_by(models.FlashcardDeck.saved_at.desc())
        .all()
    )
    return [
        FlashcardDeckResponse(
            id=d.id,
            topic=d.topic,
            difficulty=d.difficulty,
            count=d.count,
            cards=d.cards,
            saved_at=d.saved_at.isoformat(),
        )
        for d in decks
    ]


# Delete a flashcard deck
@app.delete("/flashcards/{deck_id}")
def delete_flashcard_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    deck = (
        db.query(models.FlashcardDeck)
        .filter(
            models.FlashcardDeck.id == deck_id,
            models.FlashcardDeck.owner_id == current_user.id,
        )
        .first()
    )
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    db.delete(deck)
    db.commit()
    return {"message": "Deck deleted"}

# Static Files
app.mount("/", StaticFiles(directory=".", html=True), name="static")


# Run Server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
