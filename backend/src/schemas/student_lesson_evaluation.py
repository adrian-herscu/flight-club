"""
Pydantic schemas for StudentLessonEvaluation model - request/response validation.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EvaluationResult(str, Enum):
    """Evaluation result enum (matches database)."""

    PASS = "pass"
    FAIL = "fail"
    NOT_ATTEMPTED = "not_attempted"


class StudentLessonEvaluationCreate(BaseModel):
    """Create or update evaluation (instructor only)."""

    result: EvaluationResult = Field(..., description="Student's result for lesson")
    feedback_notes: Optional[str] = Field(
        None, max_length=2048, description="Visible to student after lesson completion"
    )
    admin_notes: Optional[str] = Field(
        None, max_length=2048, description="Admin-only notes"
    )


class StudentLessonEvaluationResponse(BaseModel):
    """Evaluation response - visibility depends on lesson status and user role."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    enrollment_id: int
    course_lesson_id: int
    school_id: int
    result: EvaluationResult
    feedback_notes: Optional[str]  # Visible to student only if lesson is completed
    admin_notes: Optional[str]  # Visible to admin only
    is_finalized: bool
    created_at: datetime
    updated_at: datetime
    finalized_at: Optional[datetime]
