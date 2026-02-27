# Import all schemas for convenience
from src.schemas.course import CourseCreate, CourseResponse, CourseStatus, CourseUpdate
from src.schemas.course_lesson import (
    CourseLessonCreate,
    CourseLessonResponse,
    CourseLessonStatus,
    CourseLessonUpdate,
)
from src.schemas.instructor_assignment import (
    InstructorAssignmentCreate,
    InstructorAssignmentResponse,
)
from src.schemas.student_enrollment import (
    EnrollmentStatus,
    StudentEnrollmentApprove,
    StudentEnrollmentCreate,
    StudentEnrollmentResponse,
)
from src.schemas.student_lesson_evaluation import (
    EvaluationResult,
    StudentLessonEvaluationCreate,
    StudentLessonEvaluationResponse,
)

__all__ = [
    "CourseCreate",
    "CourseUpdate",
    "CourseResponse",
    "CourseStatus",
    "CourseLessonCreate",
    "CourseLessonUpdate",
    "CourseLessonResponse",
    "CourseLessonStatus",
    "StudentEnrollmentCreate",
    "StudentEnrollmentApprove",
    "StudentEnrollmentResponse",
    "EnrollmentStatus",
    "InstructorAssignmentCreate",
    "InstructorAssignmentResponse",
    "StudentLessonEvaluationCreate",
    "StudentLessonEvaluationResponse",
    "EvaluationResult",
]
