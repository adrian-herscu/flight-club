"""
Pytest configuration and fixtures for backend tests.
"""

import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio

# Import all models to ensure they're registered with SQLAlchemy metadata
import src.models  # noqa: F401
from fastapi import Depends
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool, StaticPool
from src.core.auth import get_current_user
from src.core.db import get_db
from src.main import app
from src.models.base import Base
from src.models.course import Course
from src.models.school import School
from src.models.syllabus import Syllabus
from src.models.user import User
from src.models.user_role import RoleType, UserRole

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
async def test_school(db: AsyncSession) -> School:
    """Create a test school."""
    school = School(
        id=1,
        name="Test Flight Club",
        description="A test flight school",
        contact_email="test@flightclub.com",
    )
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return school


@pytest_asyncio.fixture
async def test_syllabus(db: AsyncSession, test_school: School) -> Syllabus:
    """Create a test syllabus."""
    syllabus = Syllabus(
        id=1,
        title="Beginner Paragliding",
        description="Complete beginner course",
        status="final",
    )
    db.add(syllabus)
    await db.commit()
    await db.refresh(syllabus)
    return syllabus


@pytest_asyncio.fixture
async def test_course(
    db: AsyncSession, test_school: School, test_syllabus: Syllabus
) -> Course:
    """Create a test course for school A."""
    from datetime import date, timedelta

    course = Course(
        syllabus_id=test_syllabus.id,
        school_id=test_school.id,
        name="Test Course for School A",
        start_date=date.today() + timedelta(days=14),
        end_date=date.today() + timedelta(days=44),
        max_students=15,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@pytest_asyncio.fixture
async def admin_user(db: AsyncSession, test_school: School) -> User:
    """Create an admin user."""
    user = User(
        email="admin@example.com",
        name="Admin User",
        auth_provider="google",
        auth_provider_id="google-admin",
    )
    db.add(user)
    await db.flush()

    # Add admin role
    role = UserRole(
        user_id=user.id,
        role_type=RoleType.ADMIN,
        school_id=test_school.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def student_user(db: AsyncSession, test_school: School) -> User:
    """Create a student user."""
    user = User(
        email="student@example.com",
        name="Student User",
        auth_provider="google",
        auth_provider_id="google-student",
    )
    db.add(user)
    await db.flush()

    # Add student role
    role = UserRole(
        user_id=user.id,
        role_type=RoleType.STUDENT,
        school_id=test_school.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def instructor_user(db: AsyncSession, test_school: School) -> User:
    """Create an instructor user."""
    user = User(
        email="instructor@example.com",
        name="Instructor User",
        auth_provider="google",
        auth_provider_id="google-instructor",
    )
    db.add(user)
    await db.flush()

    # Add instructor role
    role = UserRole(
        user_id=user.id,
        role_type=RoleType.INSTRUCTOR,
        school_id=test_school.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def super_admin_user(db: AsyncSession) -> User:
    """Create a super admin user (no school association)."""
    user = User(
        email="superadmin@example.com",
        name="Super Admin User",
        auth_provider="google",
        auth_provider_id="google-superadmin",
    )
    db.add(user)
    await db.flush()

    # Add super admin role (no school_id)
    role = UserRole(
        user_id=user.id,
        role_type=RoleType.SUPER_ADMIN,
        school_id=None,
    )
    db.add(role)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def school_b(db: AsyncSession) -> School:
    """Create a second school for tenant isolation tests."""
    school = School(
        id=2,
        name="School B Flight Club",
        description="Second test flight school",
        contact_email="schoolb@flightclub.com",
    )
    db.add(school)
    await db.commit()
    await db.refresh(school)
    return school


@pytest_asyncio.fixture
async def school_b_admin(db: AsyncSession, school_b: School) -> User:
    """Create admin user for school B."""
    user = User(
        email="admin_b@example.com",
        name="School B Admin",
        auth_provider="google",
        auth_provider_id="google-admin-b",
    )
    db.add(user)
    await db.flush()

    role = UserRole(
        user_id=user.id,
        role_type=RoleType.ADMIN,
        school_id=school_b.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def school_b_admin_client(
    db: AsyncSession, school_b_admin: User
) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client authenticated as school B admin."""

    async def override_get_db():
        yield db

    async def override_get_current_user() -> User:
        return school_b_admin

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def school_b_student(db: AsyncSession, school_b: School) -> User:
    """Create student user for school B."""
    user = User(
        email="student_b@example.com",
        name="School B Student",
        auth_provider="google",
        auth_provider_id="google-student-b",
    )
    db.add(user)
    await db.flush()

    role = UserRole(
        user_id=user.id,
        role_type=RoleType.STUDENT,
        school_id=school_b.id,
    )
    db.add(role)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def school_b_student_client(
    db: AsyncSession, school_b_student: User
) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client authenticated as school B student."""

    async def override_get_db():
        yield db

    async def override_get_current_user() -> User:
        return school_b_student

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def school_b_course(
    db: AsyncSession, school_b: School, test_syllabus: Syllabus
) -> Course:
    """Create a test course for school B."""
    from datetime import date, timedelta

    course = Course(
        syllabus_id=test_syllabus.id,
        school_id=school_b.id,
        name="School B Test Course",
        start_date=date.today() + timedelta(days=30),
        end_date=date.today() + timedelta(days=60),
        max_students=10,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@pytest_asyncio.fixture
async def client_factory(db: AsyncSession):
    """Factory for creating test clients with different user contexts."""
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def _create_client(user: User):
        async def override_get_db():
            yield db

        async def override_get_current_user() -> User:
            return user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac

        app.dependency_overrides.clear()

    return _create_client


@pytest_asyncio.fixture
async def admin_client(
    db: AsyncSession, admin_user: User
) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client authenticated as admin."""

    async def override_get_db():
        yield db

    async def override_get_current_user() -> User:
        return admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def student_client(
    db: AsyncSession, student_user: User
) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client authenticated as student."""

    async def override_get_db():
        yield db

    async def override_get_current_user() -> User:
        return student_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def instructor_client(
    db: AsyncSession, instructor_user: User
) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client authenticated as instructor."""

    async def override_get_db():
        yield db

    async def override_get_current_user() -> User:
        return instructor_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def super_admin_client(
    db: AsyncSession, super_admin_user: User
) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client authenticated as super admin."""

    async def override_get_db():
        yield db

    async def override_get_current_user() -> User:
        return super_admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
    return {"Authorization": "Bearer mock-token"}


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
