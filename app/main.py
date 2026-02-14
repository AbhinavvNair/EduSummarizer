import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

from app.dependencies import get_db
from app import models, schemas
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")

model_context = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if API_KEY:
        client = OpenAI(
            api_key=API_KEY,
            base_url="https://api.groq.com/openai/v1",
        )
        model_context["client"] = client
    yield
    model_context.clear()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1000
    temperature: float = 0.7


@app.get("/")
async def read_index():
    return FileResponse("index.html")


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


@app.get("/me")
def read_current_user(
    current_user: models.User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": current_user.is_active,
    }


@app.post("/generate")
async def generate_text(
    request: GenerateRequest,
    current_user: models.User = Depends(get_current_user),
):
    client = model_context.get("client")
    if not client:
        raise HTTPException(status_code=503, detail="AI Client not initialized.")

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are NeuroNotes Pro. Summarize educational content with clean Markdown, bold key terms, and LaTeX ($$)."
            },
            {"role": "user", "content": request.prompt}
        ],
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    )

    return {"response": completion.choices[0].message.content}


app.mount("/", StaticFiles(directory="."), name="static")
