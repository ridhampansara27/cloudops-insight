"""PostgreSQL tests for rotating refresh-session security."""

import os
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)

from app.core.security import (
    hash_opaque_token,
    hash_password,
)
from app.models.auth import RefreshSession
from app.repositories.user_repository import UserRepository
from app.services.refresh_session_service import (
    InvalidRefreshSessionError,
    RefreshSessionReuseError,
    RefreshSessionService,
)

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


async def _create_verified_user(
    session: AsyncSession,
    *,
    email: str,
):
    repository = UserRepository(
        session,
    )

    user = await repository.create(
        email=email,
        full_name="Refresh Session User",
        password_hash=hash_password(
            "refresh-session-password",
        ),
        email_verified_at=datetime.now(
            UTC,
        ),
        commit=False,
    )

    await session.commit()

    await session.refresh(
        user,
    )

    return user


@pytest.mark.asyncio
async def test_refresh_rotation_hashes_bearers_and_detects_replay() -> None:
    """Rotated bearer replay must revoke the complete token family."""

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
            user = await _create_verified_user(
                session,
                email="refresh-rotation@example.com",
            )

            service = RefreshSessionService(
                session,
            )

            initial = await service.issue(
                user,
            )

            first_record = await session.scalar(
                select(
                    RefreshSession,
                ).where(
                    RefreshSession.token_hash
                    == hash_opaque_token(
                        initial.token,
                    ),
                )
            )

            assert first_record is not None

            # Raw refresh bearer never reaches PostgreSQL.
            assert first_record.token_hash != initial.token

            assert first_record.revoked_at is None
            assert first_record.replaced_by_id is None

            original_expiry = first_record.expires_at

            rotated = await service.rotate(
                initial.token,
            )

            assert rotated.token != initial.token
            assert rotated.family_id == initial.family_id
            assert rotated.expires_at == original_expiry

            await session.refresh(
                first_record,
            )

            assert first_record.revoked_at is not None
            assert first_record.last_used_at is not None
            assert first_record.replaced_by_id is not None

            replacement = await session.scalar(
                select(
                    RefreshSession,
                ).where(
                    RefreshSession.token_hash
                    == hash_opaque_token(
                        rotated.token,
                    ),
                )
            )

            assert replacement is not None
            assert replacement.family_id == first_record.family_id
            assert replacement.revoked_at is None

            # Replaying the old bearer is evidence that the family may
            # have been copied. It must kill the replacement as well.
            with pytest.raises(
                RefreshSessionReuseError,
            ):
                await service.rotate(
                    initial.token,
                )

            await session.refresh(
                replacement,
            )

            assert replacement.revoked_at is not None

            # The once-valid replacement must now also be unusable.
            with pytest.raises(
                RefreshSessionReuseError,
            ):
                await service.rotate(
                    rotated.token,
                )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_logout_revokes_entire_refresh_family() -> None:
    """Explicit logout invalidates the server-side refresh family."""

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
            user = await _create_verified_user(
                session,
                email="refresh-logout@example.com",
            )

            service = RefreshSessionService(
                session,
            )

            initial = await service.issue(
                user,
            )

            rotated = await service.rotate(
                initial.token,
            )

            revoked = await service.revoke_family_for_token(
                rotated.token,
            )

            assert revoked is True

            family_records = (
                await session.scalars(
                    select(
                        RefreshSession,
                    ).where(
                        RefreshSession.family_id == rotated.family_id,
                    )
                )
            ).all()

            assert (
                len(
                    family_records,
                )
                == 2
            )

            assert all(record.revoked_at is not None for record in family_records)

            with pytest.raises(
                RefreshSessionReuseError,
            ):
                await service.rotate(
                    rotated.token,
                )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_expired_refresh_session_cannot_rotate() -> None:
    """Expired refresh sessions fail even when the bearer is correct."""

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
            user = await _create_verified_user(
                session,
                email="refresh-expired@example.com",
            )

            service = RefreshSessionService(
                session,
            )

            issued = await service.issue(
                user,
            )

            record = await session.scalar(
                select(
                    RefreshSession,
                ).where(
                    RefreshSession.token_hash
                    == hash_opaque_token(
                        issued.token,
                    ),
                )
            )

            assert record is not None

            record.expires_at = datetime.now(
                UTC,
            ) - timedelta(
                seconds=1,
            )

            await session.commit()

            with pytest.raises(
                InvalidRefreshSessionError,
            ):
                await service.rotate(
                    issued.token,
                )

            await session.refresh(
                record,
            )

            assert record.revoked_at is not None

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()
