"""
Pydantic schemas for Course model - request/response validation.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CourseStatus(str, Enum):
    """Course status enum (matches database)."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CourseCreate(BaseModel):
    """Create new course."""

    syllabus_id: int = Field(..., description="Syllabus ID to base course on")
    name: str = Field(..., max_length=256, description="Course name")
    description: Optional[str] = Field(
        None, max_length=1024, description="Course description"
    )
    max_students: int = Field(..., ge=1, le=1000, description="Max student capacity")
    start_date: Optional[datetime] = Field(
        None, description="Course start date (optional)"
    )
    end_date: Optional[datetime] = Field(None, description="Course end date (optional)")


class CourseUpdate(BaseModel):
    """Update existing course."""

    name: Optional[str] = Field(None, max_length=256)
    description: Optional[str] = Field(None, max_length=1024)
    max_students: Optional[int] = Field(None, ge=1, le=1000)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[CourseStatus] = None


class CourseResponse(BaseModel):
    """Course response (read-only)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    syllabus_id: int
    name: str
    description: Optional[str]
    max_students: int
    status: CourseStatus
    start_date: datetime
    end_date: datetime
    created_at: datetime
    updated_at: datetime
