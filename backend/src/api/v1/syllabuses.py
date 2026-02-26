"""
Syllabuses endpoints for managing syllabus templates.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.auth import get_current_user
from src.core.db import get_db
from src.core.responses import success_response, error_response
from src.core.rbac import require_super_admin
from src.core.exceptions import APIError
from src.models.user import User
from src.models.syllabus import SyllabusStatus
from src.schemas.syllabus import SyllabusCreate, SyllabusUpdate, SyllabusResponse, SyllabusListItem
from src.schemas.lesson import LessonCreate, LessonResponse
from src.services import syllabus_service
from src.services.role_service import get_user_roles, has_role
from src.models.user_role import RoleType

router = APIRouter()


@router.get("/syllabuses")
async def list_syllabuses(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List syllabuses.
    
    Super-admins see all (draft + final).
    Admins see only final syllabuses.
    """
    # Check if super-admin
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)
    
    # Filter by status
    status_filter = None if is_super_admin else SyllabusStatus.FINAL
    
    syllabuses, total = await syllabus_service.get_syllabuses(
        db, status=status_filter, page=page, page_size=page_size
    )
    
    # Build response items
    items = []
    for s in syllabuses:
        items.append({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "status": s.status.value,
            "version": s.version,
            "lesson_count": len(s.lessons),
            "created_at": s.created_at.isoformat(),
            "finalized_at": s.finalized_at.isoformat() if s.finalized_at else None,
        })
    
    return success_response(
        data={
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        },
        request_id=request.state.request_id,
    )


@router.get("/syllabuses/{syllabus_id}")
async def get_syllabus(
    syllabus_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get syllabus by ID with lessons."""
    syllabus = await syllabus_service.get_syllabus_by_id(db, syllabus_id)
    
    if not syllabus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Syllabus not found",
        )
    
    # Check access: super-admins see all, others only see final
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)
    
    if not is_super_admin and syllabus.status == SyllabusStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Draft syllabuses are only visible to super-admins",
        )
    
    return success_response(
        data=SyllabusResponse.model_validate(syllabus).model_dump(),
        request_id=request.state.request_id,
    )


@router.post("/syllabuses", status_code=status.HTTP_201_CREATED)
async def create_syllabus(
    syllabus_data: SyllabusCreate,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new syllabus (super-admin only)."""
    syllabus = await syllabus_service.create_syllabus(db, syllabus_data)
    
    return success_response(
        data=SyllabusResponse.model_validate(syllabus).model_dump(),
        request_id=request.state.request_id,
    )


@router.patch("/syllabuses/{syllabus_id}")
async def update_syllabus(
    syllabus_id: int,
    syllabus_data: SyllabusUpdate,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a syllabus (super-admin only, draft only)."""
    try:
        syllabus = await syllabus_service.update_syllabus(db, syllabus_id, syllabus_data)
        return success_response(
            data=SyllabusResponse.model_validate(syllabus).model_dump(),
            request_id=request.state.request_id,
        )
    except APIError as e:
        return error_response(
            code=e.code,
            message=e.message,
            status_code=e.status_code,
            request_id=request.state.request_id,
        )


@router.post("/syllabuses/{syllabus_id}/finalize")
async def finalize_syllabus(
    syllabus_id: int,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Finalize a syllabus (super-admin only)."""
    try:
        syllabus = await syllabus_service.finalize_syllabus(db, syllabus_id)
        return success_response(
            data=SyllabusResponse.model_validate(syllabus).model_dump(),
            request_id=request.state.request_id,
        )
    except APIError as e:
        return error_response(
            code=e.code,
            message=e.message,
            status_code=e.status_code,
            request_id=request.state.request_id,
        )


@router.delete("/syllabuses/{syllabus_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_syllabus(
    syllabus_id: int,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a syllabus (super-admin only, draft only)."""
    try:
        await syllabus_service.delete_syllabus(db, syllabus_id)
    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/syllabuses/{syllabus_id}/lessons", status_code=status.HTTP_201_CREATED)
async def add_lesson(
    syllabus_id: int,
    lesson_data: LessonCreate,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add a lesson to a syllabus (super-admin only, draft only)."""
    try:
        lesson = await syllabus_service.add_lesson_to_syllabus(db, syllabus_id, lesson_data)
        return success_response(
            data=LessonResponse.model_validate(lesson).model_dump(),
            request_id=request.state.request_id,
        )
    except APIError as e:
        return error_response(
            code=e.code,
            message=e.message,
            status_code=e.status_code,
            request_id=request.state.request_id,
        )


@router.patch("/syllabuses/{syllabus_id}/lessons/{lesson_id}")
async def update_lesson(
    syllabus_id: int,
    lesson_id: int,
    lesson_data: LessonCreate,
    request: Request,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a lesson (super-admin only, draft only)."""
    try:
        lesson = await syllabus_service.update_lesson(db, lesson_id, lesson_data)
        return success_response(
            data=LessonResponse.model_validate(lesson).model_dump(),
            request_id=request.state.request_id,
        )
    except APIError as e:
        return error_response(
            code=e.code,
            message=e.message,
            status_code=e.status_code,
            request_id=request.state.request_id,
        )


@router.delete("/syllabuses/{syllabus_id}/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    syllabus_id: int,
    lesson_id: int,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a lesson (super-admin only, draft only)."""
    try:
        await syllabus_service.delete_lesson(db, lesson_id)
    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
