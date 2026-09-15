"""Real PostgreSQL tests for authentication security persistence."""

import os
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
)
from app.models.auth import (
    AuthToken,
    RefreshSession,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


@pytest.mark.asyncio
async def test_auth_tokens_and_refresh_sessions_store_hashes_only() -> None:
    """Persist verification/reset/session security state without raw tokens."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        try:
            repository = UserRepository(
                session,
            )

            user = await repository.create(
                email="auth-foundation@example.com",
                full_name="Auth Foundation",
                password_hash="test-only-password-hash",
                role="viewer",
                commit=False,
            )

            assert user.email_verified_at is None
            assert user.password_changed_at is not None

            verification_token = generate_opaque_token()

            verification_hash = hash_opaque_token(
                verification_token,
            )

            token_record = AuthToken(
                user_id=user.id,
                token_hash=verification_hash,
                purpose="email_verification",
                expires_at=(
                    datetime.now(
                        UTC,
                    )
                    + timedelta(
                        hours=24,
                    )
                ),
            )

            refresh_token = generate_opaque_token()

            refresh_hash = hash_opaque_token(
                refresh_token,
            )

            refresh_session = RefreshSession(
                user_id=user.id,
                token_hash=refresh_hash,
                expires_at=(
                    datetime.now(
                        UTC,
                    )
                    + timedelta(
                        days=30,
                    )
                ),
            )

            session.add_all(
                [
                    token_record,
                    refresh_session,
                ]
            )

            await session.commit()

            stored_token = await session.scalar(
                select(
                    AuthToken,
                ).where(
                    AuthToken.token_hash == verification_hash,
                )
            )

            stored_refresh = await session.scalar(
                select(
                    RefreshSession,
                ).where(
                    RefreshSession.token_hash == refresh_hash,
                )
            )

            assert stored_token is not None
            assert stored_refresh is not None

            assert stored_token.token_hash != verification_token

            assert stored_refresh.token_hash != refresh_token

            assert stored_token.purpose == "email_verification"

            assert stored_refresh.family_id is not None

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_user_creation_can_join_larger_atomic_transaction() -> None:
    """Signup can later roll User + Organization + Membership back together."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        try:
            repository = UserRepository(
                session,
            )

            created = await repository.create(
                email="atomic-auth@example.com",
                full_name="Atomic Auth",
                password_hash="test-only-password-hash",
                commit=False,
            )

            created_id = created.id

            # Abort the caller-owned signup transaction.
            await session.rollback()

            persisted = await session.get(
                User,
                created_id,
            )

            assert persisted is None

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()
