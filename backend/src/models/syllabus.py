import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Integer, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class SyllabusStatus(str, enum.Enum):
    """Syllabus status types."""
    DRAFT = "draft"
    FINAL = "final"


class Syllabus(Base):
    """
    Syllabus template for courses.
    
    Super-admins create reusable syllabuses with ordered lessons.
    - Draft: Editable, only visible to super-admins
    - Final: Immutable, visible to all admins for course creation
    
    Versioning: When a final syllabus needs changes, create a new draft version.
    """
    __tablename__ = "syllabuses"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[SyllabusStatus] = mapped_column(
        Enum(SyllabusStatus), nullable=False, default=SyllabusStatus.DRAFT
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    finalized_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    lessons: Mapped[List["Lesson"]] = relationship(
        "Lesson", back_populates="syllabus", cascade="all, delete-orphan", order_by="Lesson.order"
    )

    def __repr__(self) -> str:
        return f"<Syllabus(id={self.id}, title={self.title}, status={self.status}, version={self.version})>"
