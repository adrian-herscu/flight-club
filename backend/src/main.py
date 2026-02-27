from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.v1.router import api_v1_router
from src.core.config import settings
from src.core.db import engine
from src.core.middleware.request_id import add_request_id_middleware
from src.models.base import Base

app = FastAPI(
    title="School Management System API",
    version="1.0.0",
    description="Multi-tenant SaaS for managing courses, enrollments, and evaluations",
)


# Initialize database tables
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID middleware
add_request_id_middleware(app)

# API v1 router
app.include_router(api_v1_router, prefix="/api/v1")
