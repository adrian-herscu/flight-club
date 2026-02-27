"""
Course model - represents a scheduled instance of a syllabus with specific dates and students.
"""

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from src.models.base import Base


class CourseStatus(str, Enum):
    """Course lifecycle states."""

    PENDING = "pending"  # Created, not yet started
    IN_PROGRESS = "in_progress"  # At least one lesson started/completed
    COMPLETED = "completed"  # All lessons completed
    CANCELLED = "cancelled"  # Course cancelled


class Course(Base):
    """
    Course - a scheduled instance of a Syllabus with enrolled students and assigned instructors.

    A course can have a max_students limit with FIFO waitlist when at capacity.
    Status transitions:
    - pending → in_progress (when first lesson marked in_progress)
    - in_progress → completed (when all lessons completed)
    - any state → cancelled (manual admin action)
    """

    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    syllabus_id = Column(Integer, ForeignKey("syllabuses.id"), nullable=False)

    name = Column(String(256), nullable=False)
    description = Column(String(1024))

    # Enrollment management
    max_students = Column(Integer)  # NULL = unlimited
    status = Column(SQLEnum(CourseStatus), default=CourseStatus.PENDING, nullable=False)

    # Scheduling
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    school = relationship("School", back_populates="courses")
    syllabus = relationship("Syllabus")
    lessons = relationship(
        "CourseLesson", back_populates="course", cascade="all, delete-orphan"
    )
    enrollments = relationship(
        "StudentEnrollment", back_populates="course", cascade="all, delete-orphan"
    )
    instructor_assignments = relationship(
        "InstructorAssignment", back_populates="course", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Course {self.id} {self.name}>"


def __column_enum(enum_class, default=None, nullable=True):
    return Column(SQLEnum(enum_class), default=default, nullable=nullable)


def __column_datetime(nullable=True):
    return Column(DateTime, nullable=nullable)


def __column_datetime_now():
    return Column(DateTime, default=dt.utcnow, nullable=False)


def __column_datetime_now_update():
    return Column(DateTime, default=dt.utcnow, onupdate=dt.utcnow, nullable=False)


def __column_bool(default=False):
    return Column(Boolean, default=default, nullable=False)
