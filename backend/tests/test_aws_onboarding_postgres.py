"""Real PostgreSQL regression test for secure AWS onboarding."""

import os

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api.v1.cloud_accounts import (
    create_cloud_account,
    get_cloud_account_onboarding,
    update_cloud_account,
)
from app.core.tenancy import TenantContext
from app.models.cloud_account import CloudAccount
from app.models.organization import Organization, OrganizationMembership
from app.models.user import User
from app.schemas.cloud_account import CloudAccountCreate, CloudAccountUpdate

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


@pytest.mark.asyncio
async def test_external_id_is_server_owned_and_role_requires_same_account() -> None:
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
            user = User(
                email="aws-onboarding-owner@example.com",
                full_name="AWS Onboarding Owner",
                password_hash="test-only",
                role="viewer",
                is_active=True,
            )

            organization = Organization(
                name="AWS Onboarding Organization",
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

            tenant = TenantContext(
                organization_id=organization.id,
                membership_id=membership.id,
                user_id=user.id,
                role="owner",
            )

            # --------------------------------------------------
            # PHASE ONE:
            # Server generates ExternalId.
            # --------------------------------------------------

            onboarding = await create_cloud_account(
                payload=CloudAccountCreate(
                    name="Commercial AWS",
                    external_account_id="777777777777",
                    enabled_regions=[
                        "eu-central-1",
                    ],
                ),
                tenant=tenant,
                session=session,
            )

            assert onboarding.external_id.startswith(
                "coi_",
            )

            assert (
                len(
                    onboarding.external_id,
                )
                >= 40
            )

            assert onboarding.status == "pending"
            assert onboarding.role_arn is None
            assert onboarding.onboarding_ready is True
            assert onboarding.platform_principal_arn is not None
            assert onboarding.trust_policy is not None

            external_id = onboarding.external_id

            stored_account = await session.get(
                CloudAccount,
                onboarding.id,
            )

            assert stored_account is not None
            assert stored_account.external_id == external_id
            assert stored_account.role_arn is None
            assert stored_account.status == "pending"

            # --------------------------------------------------
            # Onboarding material can be reloaded by owner/admin.
            # --------------------------------------------------

            reloaded = await get_cloud_account_onboarding(
                account_id=onboarding.id,
                tenant=tenant,
                session=session,
            )

            assert reloaded.external_id == external_id

            condition = reloaded.trust_policy["Statement"][0]["Condition"][
                "StringEquals"
            ]

            assert condition["sts:ExternalId"] == external_id

            # --------------------------------------------------
            # A role from a different AWS account must be rejected.
            # --------------------------------------------------

            with pytest.raises(
                HTTPException,
            ) as mismatch:
                await update_cloud_account(
                    account_id=onboarding.id,
                    payload=CloudAccountUpdate(
                        role_arn=(
                            "arn:aws:iam::888888888888:role/CloudOpsInsightReadOnlyRole"
                        ),
                    ),
                    tenant=tenant,
                    session=session,
                )

            assert mismatch.value.status_code == 422

            await session.refresh(
                stored_account,
            )

            assert stored_account.role_arn is None
            assert stored_account.external_id == external_id

            # --------------------------------------------------
            # The matching role is accepted but still pending
            # until the explicit AWS STS validation endpoint succeeds.
            # --------------------------------------------------

            updated = await update_cloud_account(
                account_id=onboarding.id,
                payload=CloudAccountUpdate(
                    role_arn=(
                        "arn:aws:iam::777777777777:role/CloudOpsInsightReadOnlyRole"
                    ),
                ),
                tenant=tenant,
                session=session,
            )

            assert updated.role_arn == (
                "arn:aws:iam::777777777777:role/CloudOpsInsightReadOnlyRole"
            )

            assert updated.status == "pending"

            await session.refresh(
                stored_account,
            )

            # Changing the role must never rotate ExternalId.
            assert stored_account.external_id == external_id

        finally:
            await session.close()
            await outer_transaction.rollback()

    await engine.dispose()
