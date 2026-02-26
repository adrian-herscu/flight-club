from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from src.models.user_role import RoleType


class UserRoleBase(BaseModel):
    """Base user role schema."""
    role_type: RoleType
    school_id: Optional[int] = None


class UserRoleCreate(UserRoleBase):
    """Schema for creating a user role."""
    user_id: int


class UserRoleResponse(UserRoleBase):
    """Schema for user role response."""
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
