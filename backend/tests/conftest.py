"""Shared pytest fixtures for backend integration tests."""

from collections.abc import AsyncIterator

import pytest_asyncio

from app.db.session import engine as app_engine


@pytest_asyncio.fixture
async def isolated_app_db_pool() -> AsyncIterator[None]:
    """Keep the process-global application DB pool inside one pytest loop.

    The FastAPI application owns a module-level AsyncEngine, just like the
    production process. pytest-asyncio uses a separate event loop for each
    async test, so a pooled asyncpg connection from a previous test must never
    be reused by the next test.

    ``close=False`` replaces any stale pool without trying to close old
    connections through an event loop that may already be gone. The normal
    teardown then closes connections created by the current test while its
    event loop is still alive.
    """

    # Abandon any pooled connection originating from an earlier pytest loop.
    await app_engine.dispose(close=False)

    try:
        # Run the requesting HTTP integration test.
        yield
    finally:
        # Close this test's pooled connections before pytest closes its loop.
        await app_engine.dispose()
