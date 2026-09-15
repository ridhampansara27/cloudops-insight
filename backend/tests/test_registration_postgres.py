"""Real PostgreSQL commercial-registration security tests."""

import os
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)

from app.core.security import hash_opaque_token
from app.models.auth import AuthToken
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.models.user import User
from app.schemas.auth import SignupRequest
from app.services.auth_service import AuthService
from app.services.registration_service import RegistrationService

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


class CapturingVerificationSender:
    """Capture email bearer secrets in memory for integration tests."""

    def __init__(
        self,
    ) -> None:
        self.messages: list[
            tuple[
                str,
                str,
            ]
        ] = []

    async def send_verification_email(
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
async def test_signup_is_atomic_tenant_owner_and_requires_verification() -> None:
    """Signup creates exactly one isolated tenant owner and hashed token."""

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

        sender = CapturingVerificationSender()

        try:
            service = RegistrationService(
                session,
                email_sender=sender,
            )

            payload = SignupRequest(
                email="new-owner@example.com",
                full_name="New Owner",
                organization_name="New Owner Cloud",
                password="correct-horse-cloud-ops",
            )

            created = await service.register(
                payload,
                enforce_public_signup_gate=False,
            )

            assert created is True

            assert (
                len(
                    sender.messages,
                )
                == 1
            )

            recipient, raw_token = sender.messages[0]

            assert recipient == "new-owner@example.com"

            user = await session.scalar(
                select(
                    User,
                ).where(
                    User.email == "new-owner@example.com",
                )
            )

            assert user is not None
            assert user.email_verified_at is None
            assert user.password_hash != payload.password

            organization = await session.scalar(
                select(
                    Organization,
                ).where(
                    Organization.name == "New Owner Cloud",
                )
            )

            assert organization is not None

            membership = await session.scalar(
                select(
                    OrganizationMembership,
                ).where(
                    OrganizationMembership.organization_id == organization.id,
                    OrganizationMembership.user_id == user.id,
                )
            )

            assert membership is not None
            assert membership.role == "owner"
            assert membership.is_active is True

            verification = await session.scalar(
                select(
                    AuthToken,
                ).where(
                    AuthToken.user_id == user.id,
                    AuthToken.purpose == "email_verification",
                )
            )

            assert verification is not None

            assert verification.token_hash == hash_opaque_token(
                raw_token,
            )

            # Database contains a hash rather than the usable bearer.
            assert verification.token_hash != raw_token

            # Correct credentials are insufficient before email proof.
            before_verification = await AuthService(
                session,
            ).authenticate(
                email="new-owner@example.com",
                password="correct-horse-cloud-ops",
            )

            assert before_verification is None

            verified = await service.verify_email(
                raw_token,
            )

            assert verified is True

            await session.refresh(
                user,
            )

            assert user.email_verified_at is not None

            # The same bearer cannot be replayed.
            replay = await service.verify_email(
                raw_token,
            )

            assert replay is False

            after_verification = await AuthService(
                session,
            ).authenticate(
                email="new-owner@example.com",
                password="correct-horse-cloud-ops",
            )

            assert after_verification is not None
            assert after_verification.id == user.id

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_duplicate_signup_is_non_enumerating_and_creates_no_second_tenant() -> (
    None
):
    """Repeated signup must not create duplicate organization ownership."""

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

        sender = CapturingVerificationSender()

        try:
            service = RegistrationService(
                session,
                email_sender=sender,
            )

            first = SignupRequest(
                email="duplicate@example.com",
                full_name="First Identity",
                organization_name="First Tenant",
                password="commercial-password-one",
            )

            second = SignupRequest(
                email="duplicate@example.com",
                full_name="Attacker Controlled Name",
                organization_name="Second Tenant",
                password="commercial-password-two",
            )

            assert await service.register(
                first,
                enforce_public_signup_gate=False,
            )

            duplicate_created = await service.register(
                second,
                enforce_public_signup_gate=False,
            )

            assert duplicate_created is False

            user_count = await session.scalar(
                select(
                    func.count(
                        User.id,
                    ),
                ).where(
                    User.email == "duplicate@example.com",
                )
            )

            first_org_count = await session.scalar(
                select(
                    func.count(
                        Organization.id,
                    ),
                ).where(
                    Organization.name == "First Tenant",
                )
            )

            attacker_org_count = await session.scalar(
                select(
                    func.count(
                        Organization.id,
                    ),
                ).where(
                    Organization.name == "Second Tenant",
                )
            )

            assert user_count == 1
            assert first_org_count == 1
            assert attacker_org_count == 0

            # Duplicate registration does not trigger another email.
            assert (
                len(
                    sender.messages,
                )
                == 1
            )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_resend_rotates_verification_bearer() -> None:
    """Resend invalidates the previous bearer before issuing another."""

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

        sender = CapturingVerificationSender()

        try:
            service = RegistrationService(
                session,
                email_sender=sender,
            )

            payload = SignupRequest(
                email="resend@example.com",
                full_name="Resend User",
                organization_name="Resend Tenant",
                password="resend-secure-password",
            )

            assert await service.register(
                payload,
                enforce_public_signup_gate=False,
            )

            first_token = sender.messages[0][1]

            user = await session.scalar(
                select(
                    User,
                ).where(
                    User.email == "resend@example.com",
                )
            )

            assert user is not None

            original_record = await session.scalar(
                select(
                    AuthToken,
                ).where(
                    AuthToken.user_id == user.id,
                    AuthToken.purpose == "email_verification",
                    AuthToken.used_at.is_(
                        None,
                    ),
                )
            )

            assert original_record is not None

            # Move outside the configured resend cooldown.
            original_record.created_at = datetime.now(
                UTC,
            ) - timedelta(
                minutes=5,
            )

            await session.commit()

            resent = await service.resend_verification(
                "resend@example.com",
            )

            assert resent is True

            assert (
                len(
                    sender.messages,
                )
                == 2
            )

            second_token = sender.messages[1][1]

            assert second_token != first_token

            await session.refresh(
                original_record,
            )

            assert original_record.used_at is not None

            # Old link cannot verify after resend rotation.
            assert not await service.verify_email(
                first_token,
            )

            assert await service.verify_email(
                second_token,
            )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()
