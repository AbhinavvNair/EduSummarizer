from pydantic import BaseModel, EmailStr
from datetime import datetime


# User Schemas

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# Note Schemas 

class NoteCreate(BaseModel):
    title: str | None = None
    content: str


class NoteResponse(BaseModel):
    id: int
    title: str | None
    content: str
    created_at: datetime
    is_bookmarked: bool   # ← ADD THIS

    class Config:
        from_attributes = True
