"""
StudentLessonEvaluation model - records instructor evaluation of student performance in a lesson.
"""

from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from src.models.base import Base


class EvaluationResult(str, Enum):
    """Student evaluation outcome for a lesson."""

    PASS = "pass"
    FAIL = "fail"
    NOT_ATTEMPTED = "not_attempted"  # Student did not attend


class StudentLessonEvaluation(Base):
    """
    StudentLessonEvaluation - instructor's evaluation of a student's performance in a lesson.

    Visibility and mutability rules:
    - Feedback notes visible to student only AFTER lesson marked completed
    - Admin-only notes always hidden from student
    - All notes become immutable after lesson completion
    - Result (PASS/FAIL) visible to student after lesson completion

    Creation timing:
    - Row created when first note is written (lazy creation)
    - OR instructor can explicitly create row on lesson completion
    """

    __tablename__ = "student_lesson_evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    enrollment_id = Column(
        Integer, ForeignKey("student_enrollments.id"), nullable=False
    )
    course_lesson_id = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    school_id = Column(
        Integer, ForeignKey("schools.id"), nullable=False
    )  # Denormalized for tenancy

    # Evaluation result
    result = Column(SQLEnum(EvaluationResult), default=EvaluationResult.NOT_ATTEMPTED)

    # Instructor feedback (visible to student after lesson completion)
    feedback_notes = Column(Text)

    # Admin-only notes (never visible to student)
    admin_notes = Column(Text)

    # Immutability flag - becomes True when lesson marked completed
    is_finalized = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    finalized_at = Column(DateTime)  # Set when is_finalized = True

    # Relationships
    student = relationship("User", back_populates="lesson_evaluations")
    enrollment = relationship("StudentEnrollment", back_populates="evaluations")
    course_lesson = relationship("CourseLesson", back_populates="evaluations")
    school = relationship("School")

    def __repr__(self):
        return f"<StudentLessonEvaluation {self.id} student={self.student_id} lesson={self.course_lesson_id} result={self.result}>"
