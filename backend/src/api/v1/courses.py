"""
Courses endpoints for managing courses and course lessons.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.auth import get_current_user
from src.core.db import get_db
from src.core.exceptions import APIError
from src.core.responses import error_response, success_response
from src.models.user import User
from src.models.user_role import RoleType
from src.schemas.course import CourseCreate, CourseResponse, CourseUpdate
from src.schemas.course_lesson import (
    CourseLessonCreate,
    CourseLessonResponse,
    CourseLessonUpdate,
)
from src.services import course_service
from src.services.role_service import get_user_school_id, has_role

router = APIRouter()


@router.post("/courses", status_code=status.HTTP_201_CREATED)
async def create_course(
    request: Request,
    course_data: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Create a new course.

    Only school admins and super-admins can create courses.
    school_id is taken from user's school context.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    # Check permission: admin or super-admin
    is_admin = await has_role(db, current_user.id, RoleType.ADMIN, school_id)
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)

    if not (is_admin or is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create courses",
        )

    try:
        course = await course_service.create_course(
            db=db,
            school_id=school_id,
            course_data=course_data,
        )
        await db.commit()

        return success_response(
            data=CourseResponse.model_validate(course),
            request_id=request.state.request_id,
        )

    except APIError as e:
        await db.rollback()
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/courses")
async def list_courses(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    List courses for user's school.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    try:
        courses, total = await course_service.get_courses(
            db=db,
            school_id=school_id,
            status=status,
            page=page,
            page_size=page_size,
        )

        items = [CourseResponse.model_validate(c) for c in courses]

        return success_response(
            data={
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
            },
            request_id=request.state.request_id,
        )

    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/courses/{course_id}")
async def get_course(
    course_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get course by ID.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    course = await course_service.get_course_by_id(db, course_id, school_id)

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return success_response(
        data=CourseResponse.model_validate(course),
        request_id=request.state.request_id,
    )


@router.patch("/courses/{course_id}")
async def update_course(
    course_id: int,
    request: Request,
    course_data: CourseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Update course.

    Only admins can update courses.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    # Check permission
    is_admin = await has_role(db, current_user.id, RoleType.ADMIN, school_id)
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)

    if not (is_admin or is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update courses",
        )

    try:
        course = await course_service.update_course(
            db=db,
            course_id=course_id,
            school_id=school_id,
            course_data=course_data,
        )
        await db.commit()

        return success_response(
            data=CourseResponse.model_validate(course),
            request_id=request.state.request_id,
        )

    except APIError as e:
        await db.rollback()
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/courses/{course_id}/lessons")
async def get_course_lessons(
    course_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get all lessons for a course.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    try:
        lessons = await course_service.get_course_lessons(
            db=db,
            course_id=course_id,
            school_id=school_id,
        )

        items = [CourseLessonResponse.model_validate(l) for l in lessons]

        return success_response(
            data={"items": items},
            request_id=request.state.request_id,
        )

    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/courses/{course_id}/lessons")
async def create_course_lesson(
    course_id: int,
    request: Request,
    lesson_data: CourseLessonCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Create a new lesson for a course.

    Only admins can create lessons.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    # Check permission
    is_admin = await has_role(db, current_user.id, RoleType.ADMIN, school_id)
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)

    if not (is_admin or is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create lessons",
        )

    try:
        lesson = await course_service.create_course_lesson(
            db=db,
            course_id=course_id,
            school_id=school_id,
            lesson_data=lesson_data,
        )
        await db.commit()

        return success_response(
            data=CourseLessonResponse.model_validate(lesson),
            request_id=request.state.request_id,
        )

    except APIError as e:
        await db.rollback()
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.patch("/courses/{course_id}/lessons/{lesson_id}")
async def update_course_lesson(
    course_id: int,
    lesson_id: int,
    request: Request,
    lesson_data: CourseLessonUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Update a course lesson.

    Only admins can update lessons.
    """
    # Get user's school
    school_id = await get_user_school_id(db, current_user.id)
    if not school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not associated with a school",
        )

    # Check permission
    is_admin = await has_role(db, current_user.id, RoleType.ADMIN, school_id)
    is_super_admin = await has_role(db, current_user.id, RoleType.SUPER_ADMIN, None)

    if not (is_admin or is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update lessons",
        )

    try:
        lesson = await course_service.update_course_lesson(
            db=db,
            course_id=course_id,
            lesson_id=lesson_id,
            school_id=school_id,
            lesson_data=lesson_data,
        )
        await db.commit()

        return success_response(
            data=CourseLessonResponse.model_validate(lesson),
            request_id=request.state.request_id,
        )

    except APIError as e:
        await db.rollback()
        raise HTTPException(status_code=e.status_code, detail=e.message)
