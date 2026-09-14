"""Real PostgreSQL tests for password recovery security."""

import os
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)

from app.core.security import (
    access_token_matches_password_state,
    create_access_token,
    decode_access_token_claims,
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    password_state_version,
)
from app.models.auth import (
    AuthToken,
    RefreshSession,
)
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.password_reset_service import PasswordResetService

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


class CapturingPasswordResetSender:
    """Capture reset bearer secrets in memory for integration tests."""

    def __init__(
        self,
    ) -> None:
        self.messages: list[
            tuple[
                str,
                str,
            ]
        ] = []

    async def send_password_reset_email(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        self.messages.append(
            (
                recipient,
                token,
            ),
        )


@pytest.mark.asyncio
async def test_password_reset_rotates_credentials_and_revokes_sessions() -> None:
    """Reset invalidates password, bearer state and refresh sessions."""

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

        sender = CapturingPasswordResetSender()

        try:
            repository = UserRepository(
                session,
            )

            user = await repository.create(
                email="password-reset@example.com",
                full_name="Password Reset",
                password_hash=hash_password(
                    "old-commercial-password",
                ),
                email_verified_at=datetime.now(
                    UTC,
                ),
                commit=False,
            )

            await session.commit()

            old_version = password_state_version(
                user.password_changed_at,
            )

            old_access_token = create_access_token(
                str(
                    user.id,
                ),
                password_version=old_version,
            )

            old_claims = decode_access_token_claims(
                old_access_token,
            )

            assert access_token_matches_password_state(
                old_claims,
                user.password_changed_at,
            )

            refresh_secret = generate_opaque_token()

            refresh = RefreshSession(
                user_id=user.id,
                token_hash=hash_opaque_token(
                    refresh_secret,
                ),
                expires_at=(
                    datetime.now(
                        UTC,
                    )
                    + timedelta(
                        days=30,
                    )
                ),
            )

            session.add(
                refresh,
            )

            await session.commit()

            service = PasswordResetService(
                session,
                email_sender=sender,
            )

            requested = await service.request_reset(
                "password-reset@example.com",
            )

            assert requested is True

            assert (
                len(
                    sender.messages,
                )
                == 1
            )

            recipient, raw_token = sender.messages[0]

            assert recipient == "password-reset@example.com"

            reset_record = await session.scalar(
                select(
                    AuthToken,
                ).where(
                    AuthToken.user_id == user.id,
                    AuthToken.purpose == "password_reset",
                )
            )

            assert reset_record is not None

            assert reset_record.token_hash == hash_opaque_token(
                raw_token,
            )

            assert reset_record.token_hash != raw_token

            reset = await service.reset_password(
                raw_token=raw_token,
                new_password="new-commercial-password",
            )

            assert reset is True

            await session.refresh(
                user,
            )

            await session.refresh(
                refresh,
            )

            assert refresh.revoked_at is not None

            assert not access_token_matches_password_state(
                old_claims,
                user.password_changed_at,
            )

            # Reset link is one-time.
            replay = await service.reset_password(
                raw_token=raw_token,
                new_password="attacker-password-value",
            )

            assert replay is False

            auth = AuthService(
                session,
            )

            assert (
                await auth.authenticate(
                    email="password-reset@example.com",
                    password="old-commercial-password",
                )
                is None
            )

            authenticated = await auth.authenticate(
                email="password-reset@example.com",
                password="new-commercial-password",
            )

            assert authenticated is not None

            new_version = password_state_version(
                user.password_changed_at,
            )

            new_access_token = create_access_token(
                str(
                    user.id,
                ),
                password_version=new_version,
            )

            new_claims = decode_access_token_claims(
                new_access_token,
            )

            assert access_token_matches_password_state(
                new_claims,
                user.password_changed_at,
            )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_forgot_password_does_not_issue_token_for_unknown_identity() -> None:
    """Unknown addresses take the generic path without creating state."""

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

        sender = CapturingPasswordResetSender()

        try:
            service = PasswordResetService(
                session,
                email_sender=sender,
            )

            requested = await service.request_reset(
                "does-not-exist@example.com",
            )

            assert requested is False

            assert sender.messages == []

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_expired_password_reset_token_is_rejected() -> None:
    """Expired password-reset bearers can never modify credentials."""

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

        sender = CapturingPasswordResetSender()

        try:
            repository = UserRepository(
                session,
            )

            user = await repository.create(
                email="expired-reset@example.com",
                full_name="Expired Reset",
                password_hash=hash_password(
                    "unchanged-commercial-password",
                ),
                email_verified_at=datetime.now(
                    UTC,
                ),
                commit=False,
            )

            await session.commit()

            service = PasswordResetService(
                session,
                email_sender=sender,
            )

            assert await service.request_reset(
                "expired-reset@example.com",
            )

            raw_token = sender.messages[0][1]

            reset_record = await session.scalar(
                select(
                    AuthToken,
                ).where(
                    AuthToken.user_id == user.id,
                    AuthToken.purpose == "password_reset",
                    AuthToken.used_at.is_(
                        None,
                    ),
                )
            )

            assert reset_record is not None

            reset_record.expires_at = datetime.now(
                UTC,
            ) - timedelta(
                minutes=1,
            )

            await session.commit()

            assert not await service.reset_password(
                raw_token=raw_token,
                new_password="should-never-be-applied",
            )

            authenticated = await AuthService(
                session,
            ).authenticate(
                email="expired-reset@example.com",
                password="unchanged-commercial-password",
            )

            assert authenticated is not None

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()
