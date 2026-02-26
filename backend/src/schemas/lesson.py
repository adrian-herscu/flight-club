from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from src.models.syllabus import SyllabusStatus


class LessonBase(BaseModel):
    """Base lesson schema."""
    title: str
    description: Optional[str] = None
    order: int


class LessonCreate(LessonBase):
    """Schema for creating a lesson."""
    pass


class LessonResponse(LessonBase):
    """Schema for lesson response."""
    id: int
    syllabus_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
