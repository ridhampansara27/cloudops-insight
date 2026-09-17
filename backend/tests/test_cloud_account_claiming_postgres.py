"""PostgreSQL regression tests for tenant-safe AWS account claiming."""

import os

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api.v1.cloud_accounts import (
    create_cloud_account,
    update_cloud_account,
    validate_cloud_account,
)
from app.core.tenancy import TenantContext
from app.models.cloud_account import CloudAccount
from app.models.organization import Organization, OrganizationMembership
from app.models.user import User
from app.providers.aws.types import AwsIdentity
from app.schemas.cloud_account import (
    CloudAccountCreate,
    CloudAccountUpdate,
)

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


async def _create_owner_tenant(
    session: AsyncSession,
    *,
    suffix: str,
) -> TenantContext:
    """Create one isolated organization with an owner user."""

    user = User(
        email=f"aws-claim-{suffix}@example.com",
        full_name=f"AWS Claim {suffix}",
        password_hash="test-only",
        role="viewer",
        is_active=True,
    )

    organization = Organization(
        name=f"AWS Claim Organization {suffix}",
    )

    session.add_all(
        [
            user,
            organization,
        ]
    )

    await session.flush()

    membership = OrganizationMembership(
        organization_id=organization.id,
        user_id=user.id,
        role="owner",
        is_active=True,
    )

    session.add(
        membership,
    )

    await session.commit()

    return TenantContext(
        organization_id=organization.id,
        membership_id=membership.id,
        user_id=user.id,
        role="owner",
    )


@pytest.mark.asyncio
async def test_same_aws_account_can_start_onboarding_in_two_organizations() -> None:
    """One tenant must not globally reserve an AWS account ID."""

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
            tenant_a = await _create_owner_tenant(
                session,
                suffix="tenant-a",
            )

            tenant_b = await _create_owner_tenant(
                session,
                suffix="tenant-b",
            )

            aws_account_id = "909090909090"

            onboarding_a = await create_cloud_account(
                payload=CloudAccountCreate(
                    name="Tenant A AWS",
                    external_account_id=aws_account_id,
                    enabled_regions=[
                        "eu-central-1",
                    ],
                ),
                tenant=tenant_a,
                session=session,
            )

            # Security requirement:
            # Tenant A starting onboarding must not prevent Tenant B
            # from independently proving ownership of the same AWS ID.
            onboarding_b = await create_cloud_account(
                payload=CloudAccountCreate(
                    name="Tenant B AWS",
                    external_account_id=aws_account_id,
                    enabled_regions=[
                        "eu-central-1",
                    ],
                ),
                tenant=tenant_b,
                session=session,
            )

            assert onboarding_a.id != onboarding_b.id
            assert onboarding_a.external_id != onboarding_b.external_id

            result = await session.execute(
                select(
                    CloudAccount,
                ).where(
                    CloudAccount.provider == "aws",
                    CloudAccount.external_account_id == aws_account_id,
                )
            )

            accounts = list(
                result.scalars().all(),
            )

            assert len(accounts) == 2

            assert {account.organization_id for account in accounts} == {
                tenant_a.organization_id,
                tenant_b.organization_id,
            }

        finally:
            await session.close()
            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_same_organization_cannot_register_same_aws_account_twice() -> None:
    """Duplicate pending integrations inside one tenant remain prohibited."""

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
            tenant = await _create_owner_tenant(
                session,
                suffix="same-tenant",
            )

            payload = CloudAccountCreate(
                name="Tenant AWS",
                external_account_id="919191919191",
                enabled_regions=[
                    "eu-central-1",
                ],
            )

            await create_cloud_account(
                payload=payload,
                tenant=tenant,
                session=session,
            )

            with pytest.raises(
                HTTPException,
            ) as duplicate:
                await create_cloud_account(
                    payload=payload,
                    tenant=tenant,
                    session=session,
                )

            assert duplicate.value.status_code == 409
            assert duplicate.value.detail == (
                "Cloud account is already registered or unavailable."
            )

        finally:
            await session.close()
            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_only_one_organization_can_connect_same_aws_account(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only one tenant may hold the validated global AWS account claim."""

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
            tenant_a = await _create_owner_tenant(
                session,
                suffix="connected-a",
            )

            tenant_b = await _create_owner_tenant(
                session,
                suffix="connected-b",
            )

            aws_account_id = "929292929292"

            onboarding_a = await create_cloud_account(
                payload=CloudAccountCreate(
                    name="Connected Tenant A",
                    external_account_id=aws_account_id,
                    enabled_regions=[
                        "eu-central-1",
                    ],
                ),
                tenant=tenant_a,
                session=session,
            )

            onboarding_b = await create_cloud_account(
                payload=CloudAccountCreate(
                    name="Connected Tenant B",
                    external_account_id=aws_account_id,
                    enabled_regions=[
                        "eu-central-1",
                    ],
                ),
                tenant=tenant_b,
                session=session,
            )

            # Each tenant receives an independent ExternalId while pending.
            assert onboarding_a.external_id != onboarding_b.external_id

            # Configure a matching role for each onboarding record.
            await update_cloud_account(
                account_id=onboarding_a.id,
                payload=CloudAccountUpdate(
                    role_arn=(
                        "arn:aws:iam::929292929292:role/CloudOpsInsightReadOnlyRole"
                    ),
                ),
                tenant=tenant_a,
                session=session,
            )

            await update_cloud_account(
                account_id=onboarding_b.id,
                payload=CloudAccountUpdate(
                    role_arn=(
                        "arn:aws:iam::929292929292:role/CloudOpsInsightReadOnlyRole"
                    ),
                ),
                tenant=tenant_b,
                session=session,
            )

            # Avoid real AWS calls. Simulate successful STS identity proof
            # for either tenant using the account being validated.
            def fake_validate_account(
                _service,
                account,
            ) -> AwsIdentity:
                return AwsIdentity(
                    account_id=account.account_id,
                    arn=(
                        f"arn:aws:sts::{account.account_id}:"
                        "assumed-role/CloudOpsInsightReadOnlyRole/test"
                    ),
                    user_id="test-user-id",
                )

            monkeypatch.setattr(
                ("app.api.v1.cloud_accounts.AwsConnectionService.validate_account"),
                fake_validate_account,
            )

            # Tenant A completes ownership proof first.
            validated_a = await validate_cloud_account(
                account_id=onboarding_a.id,
                tenant=tenant_a,
                session=session,
            )

            assert validated_a.connected is True
            assert validated_a.account_id == aws_account_id

            # Tenant B can also prove AWS access, but it must not obtain
            # a second global connected claim for the same AWS account.
            with pytest.raises(
                HTTPException,
            ) as competing_claim:
                await validate_cloud_account(
                    account_id=onboarding_b.id,
                    tenant=tenant_b,
                    session=session,
                )

            assert competing_claim.value.status_code == 409
            assert competing_claim.value.detail == (
                "AWS account is already connected or unavailable."
            )

            account_a = await session.get(
                CloudAccount,
                onboarding_a.id,
            )

            account_b = await session.get(
                CloudAccount,
                onboarding_b.id,
            )

            assert account_a is not None
            assert account_b is not None

            # The first validated owner keeps the connected claim.
            assert account_a.status == "connected"
            assert account_a.last_validation_error is None

            # The competing tenant remains isolated and does not become
            # connected merely because it could assume its own configured role.
            assert account_b.status == "error"
            assert account_b.last_validation_error == (
                "AWS account is already connected or unavailable."
            )

        finally:
            await session.close()
            await outer_transaction.rollback()

    await engine.dispose()
