"""
InstructorAssignment model - represents an instructor assigned to a course or specific lesson.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship
from src.models.base import Base


class InstructorAssignment(Base):
    """
    InstructorAssignment - represents an instructor teaching a lesson or all lessons in a course.

    Two modes:
    1. Course-level (course_lesson_id IS NULL): Instructor assigned to all current and future lessons in course
    2. Lesson-level (course_lesson_id NOT NULL): Instructor assigned to specific lesson

    Overbooking prevention:
    - When assigning, check if instructor has any assignment at same location overlapping the time window
    - Time window = [start_time, start_time + duration_hours]
    - Overlapping means: assignment.start_time < lesson.end_time AND assignment.end_time > lesson.start_time

    Constraints:
    - No duplicate course-level assignments (same instructor, same course, course_lesson_id IS NULL)
    - On lesson time/duration change, re-check conflicts for all assignments
    """

    __tablename__ = "instructor_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    course_lesson_id = Column(
        Integer, ForeignKey("course_lessons.id")
    )  # NULL = course-level

    school_id = Column(
        Integer, ForeignKey("schools.id"), nullable=False
    )  # Denormalized for tenancy

    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    instructor = relationship("User", back_populates="instructor_assignments")
    course = relationship("Course", back_populates="instructor_assignments")
    course_lesson = relationship(
        "CourseLesson", back_populates="instructor_assignments"
    )
    school = relationship("School")

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_instructor_assignments_instructor_id", "instructor_id"),
        Index("ix_instructor_assignments_course_id", "course_id"),
        Index("ix_instructor_assignments_course_lesson_id", "course_lesson_id"),
        # Unique index for course-level assignments (prevent duplicate course-level assignments)
        Index(
            "ix_instructor_assignments_course_level",
            "instructor_id",
            "course_id",
            "course_lesson_id",
            unique=True,
        ),  # WHERE course_lesson_id IS NULL
    )

    def __repr__(self):
        if self.course_lesson_id:
            return f"<InstructorAssignment {self.id} instructor={self.instructor_id} lesson={self.course_lesson_id}>"
        else:
            return f"<InstructorAssignment {self.id} instructor={self.instructor_id} course={self.course_id} (course-level)>"
