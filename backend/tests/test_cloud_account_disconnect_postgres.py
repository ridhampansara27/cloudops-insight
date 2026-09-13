"""Real PostgreSQL tests for disconnect and stale-task invalidation."""

import inspect
import os
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api.v1.cloud_accounts import disconnect_cloud_account
from app.core.tenancy import TenantContext
from app.models.budget import Budget
from app.models.cloud_account import CloudAccount
from app.models.cost import CostRecord
from app.models.organization import Organization, OrganizationMembership
from app.models.resource import CloudResource
from app.models.user import User
from app.services.cloud_account_connection_guard import (
    StaleCloudAccountConnectionError,
    require_connection_revision,
)
from app.tasks.aws_sync import (
    sync_aws_account_task,
    sync_aws_costs_task,
    sync_aws_metrics_task,
)

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


def test_all_aws_worker_tasks_require_connection_revision() -> None:
    """Every provider task must receive the generation captured at enqueue."""

    for task in (
        sync_aws_account_task,
        sync_aws_metrics_task,
        sync_aws_costs_task,
    ):
        parameters = list(
            inspect.signature(
                task.run,
            ).parameters,
        )

        assert parameters == [
            "account_id",
            "connection_revision",
        ]


@pytest.mark.asyncio
async def test_disconnect_invalidates_old_work_and_preserves_history() -> None:
    """Disconnect must block old generations without deleting customer history."""

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
            now = datetime.now(
                UTC,
            )

            user = User(
                email="disconnect-owner@example.com",
                full_name="Disconnect Owner",
                password_hash="test-only",
                role="viewer",
                is_active=True,
            )

            organization = Organization(
                name="Disconnect Test Organization",
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

            account = CloudAccount(
                organization_id=organization.id,
                provider="aws",
                name="Disconnect AWS",
                external_account_id="888888888888",
                role_arn=("arn:aws:iam::888888888888:role/CloudOpsInsightReadOnlyRole"),
                external_id="coi_disconnect_test",
                enabled_regions=[
                    "eu-central-1",
                ],
                status="connected",
                sync_status="queued",
                created_by_id=user.id,
            )

            session.add_all(
                [
                    membership,
                    account,
                ]
            )

            await session.flush()

            resource = CloudResource(
                cloud_account_id=account.id,
                provider_resource_id="i-disconnect-history",
                name="Historical Instance",
                service="EC2",
                resource_type="AWS::EC2::Instance",
                region="eu-central-1",
                cloud_state="running",
                health_state="healthy",
                resource_metadata={},
                is_active=True,
            )

            session.add(
                resource,
            )

            await session.flush()

            cost = CostRecord(
                cloud_account_id=account.id,
                resource_id=resource.id,
                usage_date=now.date(),
                service="Amazon EC2",
                cost_type="resource_direct",
                amount=Decimal(
                    "12.34",
                ),
                currency="USD",
                is_estimated=False,
            )

            account_budget = Budget(
                organization_id=organization.id,
                name="Account Budget",
                scope_type="account",
                scope_value=str(
                    account.id,
                ),
                monthly_limit=Decimal(
                    "100.00",
                ),
                warning_threshold=80,
                critical_threshold=100,
                is_active=True,
                created_by_id=user.id,
            )

            service_budget = Budget(
                organization_id=organization.id,
                name="Service Budget",
                scope_type="service",
                scope_value="Amazon EC2",
                monthly_limit=Decimal(
                    "200.00",
                ),
                warning_threshold=80,
                critical_threshold=100,
                is_active=True,
                created_by_id=user.id,
            )

            session.add_all(
                [
                    cost,
                    account_budget,
                    service_budget,
                ]
            )

            await session.commit()

            old_revision = account.connection_revision

            tenant = TenantContext(
                organization_id=organization.id,
                membership_id=membership.id,
                user_id=user.id,
                role="owner",
            )

            result = await disconnect_cloud_account(
                account_id=account.id,
                tenant=tenant,
                session=session,
            )

            assert result.status == "disconnected"
            assert result.connection_revision == old_revision + 1
            assert result.account_budgets_deactivated == 1
            assert result.disconnected_at is not None

            await session.refresh(
                account,
            )

            assert account.status == "disconnected"
            assert account.connection_revision == old_revision + 1
            assert account.sync_status == "idle"
            assert account.sync_started_at is None
            assert account.disconnected_at is not None

            # AWS configuration is retained for explicit future reconnect.
            assert account.role_arn is not None
            assert account.external_id == "coi_disconnect_test"

            await session.refresh(
                account_budget,
            )

            await session.refresh(
                service_budget,
            )

            assert account_budget.is_active is False

            # Organization/service budgets are not destroyed merely because
            # one provider integration was disconnected.
            assert service_budget.is_active is True

            # Historical inventory remains available.
            stored_resource = await session.scalar(
                select(
                    CloudResource,
                ).where(
                    CloudResource.id == resource.id,
                )
            )

            stored_cost = await session.scalar(
                select(
                    CostRecord,
                ).where(
                    CostRecord.id == cost.id,
                )
            )

            assert stored_resource is not None
            assert stored_cost is not None
            assert stored_cost.amount == Decimal(
                "12.340000",
            )

            # Work queued before disconnect can no longer run.
            with pytest.raises(
                StaleCloudAccountConnectionError,
            ):
                await require_connection_revision(
                    session,
                    account_id=account.id,
                    expected_revision=old_revision,
                    required_status="connected",
                )

            # Even the newest revision cannot run while disconnected.
            with pytest.raises(
                StaleCloudAccountConnectionError,
            ):
                await require_connection_revision(
                    session,
                    account_id=account.id,
                    expected_revision=account.connection_revision,
                    required_status="connected",
                )

            revision_after_first_disconnect = account.connection_revision

            # Disconnect is idempotent and does not churn generations.
            repeated = await disconnect_cloud_account(
                account_id=account.id,
                tenant=tenant,
                session=session,
            )

            assert repeated.connection_revision == revision_after_first_disconnect
            assert repeated.account_budgets_deactivated == 0

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()
