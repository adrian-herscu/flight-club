"""
Pytest configuration and fixtures for backend tests.
"""
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool, StaticPool

from src.main import app
from src.models.base import Base
from src.models.user import User
from src.core.db import get_db

# Import all models to ensure they're registered with SQLAlchemy metadata
import src.models  # noqa: F401

# Test database URL - using SQLite for simplicity
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create test database engine."""
    # Use StaticPool to keep the same in-memory database across connections
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture
async def db(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client with database override."""
    async def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def google_jwt_payload() -> dict:
    """Sample Google JWT payload for testing."""
    return {
        "sub": "google-12345",
        "email": "test@example.com",
        "name": "Test User",
        "email_verified": True,
        "iss": "https://accounts.google.com",
    }


@pytest_asyncio.fixture
async def user(db: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        name="Test User",
        auth_provider="google",
        auth_provider_id="google-12345",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def auth_headers(google_jwt_payload: dict) -> dict:
    """
    Mock auth headers for testing.
    
    Note: In real implementation, this would be a valid JWT token.
    For now, we'll create a mock that the auth dependency can recognize.
    """
    # This will need to be updated once we implement JWT verification
    return {
        "Authorization": "Bearer mock-token"
    }


@pytest.fixture
def student_auth_headers() -> dict:
    """Mock auth headers for student role."""
    return {"Authorization": "Bearer mock-student-token"}


@pytest.fixture
def instructor_auth_headers() -> dict:
    """Mock auth headers for instructor role."""
    return {"Authorization": "Bearer mock-instructor-token"}


@pytest.fixture
def admin_auth_headers() -> dict:
    """Mock auth headers for admin role."""
    return {"Authorization": "Bearer mock-admin-token"}


@pytest.fixture
def super_admin_auth_headers() -> dict:
    """Mock auth headers for super-admin role."""
    return {"Authorization": "Bearer mock-super-admin-token"}
