"""
CourseLesson model - represents a specific scheduled lesson within a course.
"""

from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from src.models.base import Base


class CourseLessonStatus(str, Enum):
    """Course lesson lifecycle states."""

    SCHEDULED = "scheduled"  # Scheduled, not yet started
    IN_PROGRESS = "in_progress"  # Lesson in progress
    COMPLETED = "completed"  # Lesson completed, evaluations recorded
    CANCELLED = "cancelled"  # Lesson cancelled


class CourseLesson(Base):
    """
    CourseLesson - a specific instance of a lesson within a course.

    Each lesson has:
    - A time window [start_time, start_time + duration_hours] for scheduling
    - A location for conflict detection
    - Status tracking (scheduled → in_progress → completed)
    - Sequence order within the course
    - Instructor assignment(s)
    """

    __tablename__ = "course_lessons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    # From syllabus lesson or created directly
    title = Column(String(256), nullable=False)
    description = Column(String(1024))

    # Scheduling and location
    start_time = Column(DateTime)  # NULL if unscheduled
    duration_hours = Column(Float, nullable=False, default=2.0)  # In hours
    location = Column(String(256))  # For conflict detection

    # Ordering within course
    sequence_order = Column(Integer, nullable=False)

    # Status
    status = Column(
        SQLEnum(CourseLessonStatus),
        default=CourseLessonStatus.SCHEDULED,
        nullable=False,
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    course = relationship("Course", back_populates="lessons")
    instructor_assignments = relationship(
        "InstructorAssignment",
        back_populates="course_lesson",
        cascade="all, delete-orphan",
    )
    evaluations = relationship(
        "StudentLessonEvaluation",
        back_populates="course_lesson",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<CourseLesson {self.id} {self.title}>"
