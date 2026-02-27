"""
Pydantic schemas for StudentEnrollment model - request/response validation.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class EnrollmentStatus(str, Enum):
    """Enrollment status enum (matches database)."""

    PENDING_APPROVAL = "pending_approval"
    ENROLLED = "enrolled"
    WAITLIST = "waitlist"
    REJECTED = "rejected"
    UNENROLLED = "unenrolled"


class StudentEnrollmentCreate(BaseModel):
    """Create new student enrollment request."""

    course_id: int = Field(..., description="Course ID to enroll in")


class StudentEnrollmentApprove(BaseModel):
    """Admin approval of enrollment request."""

    status: EnrollmentStatus = Field(
        ..., description="New status (enrolled or rejected)"
    )
    rejection_reason: Optional[str] = Field(
        None, max_length=512, description="Reason if rejecting"
    )


class StudentEnrollmentResponse(BaseModel):
    """Enrollment response (read-only)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    course_id: int
    school_id: int
    status: EnrollmentStatus
    rejection_reason: Optional[str]
    waitlist_position: Optional[int]
    payment_id: Optional[str]
    payment_status: Optional[str]
    created_at: datetime
    updated_at: datetime
