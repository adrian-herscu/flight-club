from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base


class Lesson(Base):
    """
    Lesson template within a syllabus.
    
    Defines the ordered sequence of lessons in a syllabus.
    When a course is created from a syllabus, these lessons become CourseLesson instances.
    """
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    syllabus_id: Mapped[int] = mapped_column(
        ForeignKey("syllabuses.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    syllabus: Mapped["Syllabus"] = relationship("Syllabus", back_populates="lessons")

    def __repr__(self) -> str:
        return f"<Lesson(id={self.id}, syllabus_id={self.syllabus_id}, title={self.title}, order={self.order})>"
