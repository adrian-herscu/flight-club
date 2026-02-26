import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class RoleType(str, enum.Enum):
    """User role types."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    INSTRUCTOR = "instructor"
    STUDENT = "student"


class UserRole(Base):
    """
    User roles with school scoping.
    
    - Super-admin: school_id is NULL (global access)
    - Admin/Instructor/Student: school_id is set (scoped to specific school)
    
    A user can have multiple roles across different schools.
    """
    __tablename__ = "user_roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    school_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), nullable=True
    )
    role_type: Mapped[RoleType] = mapped_column(Enum(RoleType), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Unique constraint: one role per user per school
    __table_args__ = (
        UniqueConstraint("user_id", "school_id", "role_type", name="uq_user_school_role"),
    )

    def __repr__(self) -> str:
        return f"<UserRole(user_id={self.user_id}, school_id={self.school_id}, role={self.role_type})>"
