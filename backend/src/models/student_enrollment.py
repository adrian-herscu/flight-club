"""
StudentEnrollment model - represents a student's enrollment in a course with approval workflow.
"""

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from src.models.base import Base


class EnrollmentStatus(str, Enum):
    """Enrollment lifecycle states."""

    PENDING_APPROVAL = "pending_approval"  # Student requested, awaiting admin approval
    ENROLLED = "enrolled"  # Approved and enrolled
    WAITLIST = "waitlist"  # Approved but course at capacity, on waitlist
    REJECTED = "rejected"  # Admin rejected enrollment
    UNENROLLED = "unenrolled"  # Student unenrolled


class StudentEnrollment(Base):
    """
    StudentEnrollment - represents a student's enrollment in a course.

    Status flow:
    - pending_approval: Student requested, admin must approve or reject
    - enrolled: Approved and enrolled (or promoted from waitlist)
    - waitlist: Approved but course at capacity, FIFO ordering
    - rejected: Admin rejected with optional reason
    - unenrolled: Student withdrew or was removed

    Waitlist is FIFO ordered by created_at timestamp.
    When capacity opens, first waitlist entry is automatically promoted to enrolled.
    """

    __tablename__ = "student_enrollments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    school_id = Column(
        Integer, ForeignKey("schools.id"), nullable=False
    )  # Denormalized for tenancy

    # Enrollment state
    status = Column(
        SQLEnum(EnrollmentStatus),
        default=EnrollmentStatus.PENDING_APPROVAL,
        nullable=False,
    )

    # Rejection reason (if rejected)
    rejection_reason = Column(Text)

    # Waitlist position (if status = waitlist)
    waitlist_position = Column(Integer)  # FIFO order, NULL if not on waitlist

    # Payment integration (V2 feature)
    payment_id = Column(String(256))
    payment_status = Column(String(50))

    created_at = Column(
        DateTime, default=datetime.utcnow, nullable=False
    )  # Used for FIFO ordering
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    school = relationship("School")
    evaluations = relationship(
        "StudentLessonEvaluation",
        back_populates="enrollment",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        # Unique enrollment per student per course (only one active enrollment at a time)
        # But allows historical rejected/unenrolled records
        # Index for quick lookup of pending approvals
        # Index for waitlist ordering
    )

    def __repr__(self):
        return f"<StudentEnrollment {self.id} student={self.student_id} course={self.course_id} status={self.status}>"
