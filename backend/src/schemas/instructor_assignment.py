"""
Pydantic schemas for InstructorAssignment model - request/response validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class InstructorAssignmentCreate(BaseModel):
    """Create new instructor assignment."""

    instructor_id: int = Field(..., description="Instructor ID")
    course_id: Optional[int] = Field(
        None, description="Course ID (optional if lesson_id provided)"
    )
    course_lesson_id: Optional[int] = Field(
        None, description="Lesson ID (null for course-level)"
    )


class InstructorAssignmentResponse(BaseModel):
    """Instructor assignment response (read-only)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    instructor_id: int
    course_id: int
    course_lesson_id: Optional[int]
    school_id: int
    assigned_at: datetime
