from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema with common attributes."""
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    auth_provider: str = "google"
    auth_provider_id: str


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    name: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    auth_provider: str
    created_at: datetime
    updated_at: datetime
    roles: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class UserMe(BaseModel):
    """Schema for /me endpoint response."""
    id: int
    email: str
    name: Optional[str] = None
    roles: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
