from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from src.models.syllabus import SyllabusStatus
from src.schemas.lesson import LessonResponse


class SyllabusBase(BaseModel):
    """Base syllabus schema."""
    title: str
    description: Optional[str] = None


class SyllabusCreate(SyllabusBase):
    """Schema for creating a syllabus."""
    status: SyllabusStatus = SyllabusStatus.DRAFT


class SyllabusUpdate(BaseModel):
    """Schema for updating a syllabus."""
    title: Optional[str] = None
    description: Optional[str] = None


class SyllabusResponse(SyllabusBase):
    """Schema for syllabus response."""
    id: int
    status: SyllabusStatus
    version: int
    created_at: datetime
    updated_at: datetime
    finalized_at: Optional[datetime] = None
    lessons: List[LessonResponse] = []

    model_config = {"from_attributes": True}


class SyllabusListItem(BaseModel):
    """Schema for syllabus list item (without lessons)."""
    id: int
    title: str
    description: Optional[str] = None
    status: SyllabusStatus
    version: int
    lesson_count: int = 0
    created_at: datetime
    finalized_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
