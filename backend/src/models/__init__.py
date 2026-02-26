# Import all models to ensure they're registered with SQLAlchemy metadata
from src.models.base import Base
from src.models.user import User
from src.models.user_role import UserRole, RoleType
from src.models.school import School
from src.models.syllabus import Syllabus, SyllabusStatus
from src.models.lesson import Lesson

__all__ = [
    "Base",
    "User",
    "UserRole",
    "RoleType",
    "School",
    "Syllabus",
    "SyllabusStatus",
    "Lesson",
]
