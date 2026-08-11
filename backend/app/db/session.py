# Import the async-iterator type used by FastAPI dependencies.
from collections.abc import AsyncIterator

# Import SQLAlchemy's asynchronous session type.
# Import SQLAlchemy's asynchronous session factory.
# Import SQLAlchemy's asynchronous engine creator.
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Import the validated application settings.
from app.core.config import settings

# Create the shared asynchronous PostgreSQL engine.
engine = create_async_engine(
    # Use the configured asyncpg PostgreSQL URL.
    settings.database_url,
    # Verify pooled connections before reusing them.
    pool_pre_ping=True,
    # Enable SQL logging only when explicitly configured.
    echo=settings.sql_echo,
)


# Create the reusable asynchronous session factory.
async_session_factory = async_sessionmaker(
    # Bind sessions to the application's async engine.
    bind=engine,
    # Ensure ORM objects remain usable after transaction commits.
    expire_on_commit=False,
    # Explicitly create AsyncSession instances.
    class_=AsyncSession,
)


# Provide one database session per request.
async def get_db_session() -> AsyncIterator[AsyncSession]:
    # Create a session using the shared session factory.
    async with async_session_factory() as session:
        # Give the session to the FastAPI endpoint.
        yield session
