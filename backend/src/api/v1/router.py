from fastapi import APIRouter
from src.api.v1 import (
    auth,
    courses,
    enrollments,
    health,
    instructors,
    schools,
    syllabuses,
)

api_v1_router = APIRouter()

api_v1_router.include_router(health.router, tags=["health"])
api_v1_router.include_router(auth.router, tags=["auth"])
api_v1_router.include_router(schools.router, tags=["schools"])
api_v1_router.include_router(syllabuses.router, tags=["syllabuses"])
api_v1_router.include_router(courses.router, tags=["courses"])
api_v1_router.include_router(enrollments.router, tags=["enrollments"])
api_v1_router.include_router(instructors.router, tags=["instructors"])
