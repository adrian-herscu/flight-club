from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class SchoolBase(BaseModel):
    """Base school schema."""
    name: str
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class SchoolCreate(SchoolBase):
    """Schema for creating a school."""
    pass


class SchoolUpdate(BaseModel):
    """Schema for updating a school."""
    name: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class SchoolResponse(SchoolBase):
    """Schema for school response."""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
