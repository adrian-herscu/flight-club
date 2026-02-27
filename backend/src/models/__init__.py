# Import all models to ensure they're registered with SQLAlchemy metadata
from src.models.base import Base
from src.models.course import Course, CourseStatus
from src.models.course_lesson import CourseLesson, CourseLessonStatus
from src.models.instructor_assignment import InstructorAssignment
from src.models.lesson import Lesson
from src.models.school import School
from src.models.student_enrollment import EnrollmentStatus, StudentEnrollment
from src.models.student_lesson_evaluation import (
    EvaluationResult,
    StudentLessonEvaluation,
)
from src.models.syllabus import Syllabus, SyllabusStatus
from src.models.user import User
from src.models.user_role import RoleType, UserRole

__all__ = [
    "Base",
    "User",
    "UserRole",
    "RoleType",
    "School",
    "Syllabus",
    "SyllabusStatus",
    "Lesson",
    "Course",
    "CourseStatus",
    "CourseLesson",
    "CourseLessonStatus",
    "StudentEnrollment",
    "EnrollmentStatus",
    "InstructorAssignment",
    "StudentLessonEvaluation",
    "EvaluationResult",
]
