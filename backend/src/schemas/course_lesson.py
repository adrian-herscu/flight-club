"""
Pydantic schemas for CourseLesson model - request/response validation.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CourseLessonStatus(str, Enum):
    """Course lesson status enum (matches database)."""

    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CourseLessonCreate(BaseModel):
    """Create new course lesson."""

    course_id: int = Field(..., description="Course ID")
    title: str = Field(..., max_length=256, description="Lesson title")
    description: Optional[str] = Field(
        None, max_length=1024, description="Lesson description"
    )
    start_time: Optional[datetime] = Field(
        None, description="Lesson start time (optional for unscheduled)"
    )
    duration_hours: float = Field(
        default=2.0, ge=0.5, le=8, description="Duration in hours"
    )
    location: Optional[str] = Field(None, max_length=256, description="Lesson location")
    sequence_order: int = Field(..., ge=1, description="Order within course")


class CourseLessonUpdate(BaseModel):
    """Update existing course lesson."""

    title: Optional[str] = Field(None, max_length=256)
    description: Optional[str] = Field(None, max_length=1024)
    start_time: Optional[datetime] = None
    duration_hours: Optional[float] = Field(None, ge=0.5, le=8)
    location: Optional[str] = Field(None, max_length=256)
    sequence_order: Optional[int] = Field(None, ge=1)
    status: Optional[CourseLessonStatus] = None


class CourseLessonResponse(BaseModel):
    """Course lesson response (read-only)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    description: Optional[str]
    start_time: Optional[datetime]
    duration_hours: float
    location: Optional[str]
    sequence_order: int
    status: CourseLessonStatus
    created_at: datetime
    updated_at: datetime
