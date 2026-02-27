from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Convert HTTPException to standardized API response format.

    This ensures all errors (including auth failures) follow the API contract:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable message"
        }
    }
    """
    # Map common HTTPException details to error codes
    error_code_map = {
        "Not authenticated": "AUTHENTICATION_REQUIRED",
        "Could not validate credentials": "INVALID_CREDENTIALS",
        "Token has expired": "TOKEN_EXPIRED",
    }

    # Extract error code from detail or use default
    error_code = error_code_map.get(exc.detail, "HTTP_ERROR")
    if isinstance(exc.detail, str) and "Invalid token" in exc.detail:
        error_code = "INVALID_TOKEN"

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": error_code,
                "message": (
                    exc.detail if isinstance(exc.detail, str) else str(exc.detail)
                ),
            },
        },
        headers=exc.headers,
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
