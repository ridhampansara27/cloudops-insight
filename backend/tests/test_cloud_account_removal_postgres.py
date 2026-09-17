"""Real PostgreSQL tests for permanent cloud-account removal."""

import os
from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api.v1.cloud_accounts import (
    disconnect_cloud_account,
    remove_cloud_account,
    update_cloud_account,
    validate_cloud_account,
)
from app.core.tenancy import TenantContext
from app.models.budget import Budget
from app.models.cloud_account import CloudAccount
from app.models.cost import CostRecord
from app.models.incident import Incident
from app.models.metric import MetricSample
from app.models.organization import Organization, OrganizationMembership
from app.models.recommendation import Recommendation
from app.models.resource import CloudResource, ResourceTag
from app.models.user import User
from app.providers.aws.connection import AwsConnectionService
from app.providers.aws.discovery import AwsDiscoveryService
from app.providers.aws.session import AwsSessionFactory
from app.schemas.cloud_account import (
    CloudAccountRemovalRequest,
    CloudAccountUpdate,
)
from app.services.cloud_account_connection_guard import (
    StaleCloudAccountConnectionError,
    require_connection_revision,
)
from app.tasks.aws_sync import (
    _run_account_sync,
    _run_cost_sync,
    _run_metric_sync,
)

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)

pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


def test_remove_confirmation_must_be_exact_and_forbid_extra_fields() -> None:
    """Destructive removal must require exactly the documented confirmation."""

    valid = CloudAccountRemovalRequest.model_validate(
        {
            "confirmation": "REMOVE",
        }
    )

    assert valid.confirmation == "REMOVE"

    with pytest.raises(ValidationError):
        CloudAccountRemovalRequest.model_validate(
            {
                "confirmation": "remove",
            }
        )

    with pytest.raises(ValidationError):
        CloudAccountRemovalRequest.model_validate(
            {
                "confirmation": "REMOVE",
                "unexpected": True,
            }
        )


@pytest.mark.asyncio
async def test_remove_cloud_account_purges_only_target_integration_data() -> None:
    """Permanent removal must purge one tenant integration and nothing else."""

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

            # Create two completely independent tenants.
            user_a = User(
                email="remove-owner-a@example.com",
                full_name="Removal Owner A",
                password_hash="test-only",
                role="viewer",
                is_active=True,
            )

            user_b = User(
                email="remove-owner-b@example.com",
                full_name="Removal Owner B",
                password_hash="test-only",
                role="viewer",
                is_active=True,
            )

            organization_a = Organization(
                name="Removal Organization A",
            )

            organization_b = Organization(
                name="Removal Organization B",
            )

            session.add_all(
                [
                    user_a,
                    user_b,
                    organization_a,
                    organization_b,
                ]
            )

            await session.flush()

            membership_a = OrganizationMembership(
                organization_id=organization_a.id,
                user_id=user_a.id,
                role="owner",
                is_active=True,
            )

            membership_b = OrganizationMembership(
                organization_id=organization_b.id,
                user_id=user_b.id,
                role="owner",
                is_active=True,
            )

            account_a = CloudAccount(
                organization_id=organization_a.id,
                provider="aws",
                name="Removal AWS A",
                external_account_id="737373737373",
                role_arn=("arn:aws:iam::737373737373:role/CloudOpsInsightReadOnlyRole"),
                external_id="coi_remove_a",
                enabled_regions=[
                    "eu-central-1",
                ],
                status="connected",
                sync_status="queued",
                created_by_id=user_a.id,
            )

            # This second account proves that another tenant is untouched.
            account_b = CloudAccount(
                organization_id=organization_b.id,
                provider="aws",
                name="Removal AWS B",
                external_account_id="747474747474",
                role_arn=("arn:aws:iam::747474747474:role/CloudOpsInsightReadOnlyRole"),
                external_id="coi_remove_b",
                enabled_regions=[
                    "eu-central-1",
                ],
                status="connected",
                sync_status="idle",
                created_by_id=user_b.id,
            )

            session.add_all(
                [
                    membership_a,
                    membership_b,
                    account_a,
                    account_b,
                ]
            )

            await session.flush()

            resource_a = CloudResource(
                cloud_account_id=account_a.id,
                provider_resource_id="i-removal-a",
                name="Removal Instance A",
                service="EC2",
                resource_type="AWS::EC2::Instance",
                region="eu-central-1",
                cloud_state="running",
                health_state="healthy",
                resource_metadata={},
                is_active=True,
            )

            resource_b = CloudResource(
                cloud_account_id=account_b.id,
                provider_resource_id="i-removal-b",
                name="Removal Instance B",
                service="EC2",
                resource_type="AWS::EC2::Instance",
                region="eu-central-1",
                cloud_state="running",
                health_state="healthy",
                resource_metadata={},
                is_active=True,
            )

            session.add_all(
                [
                    resource_a,
                    resource_b,
                ]
            )

            await session.flush()

            # Populate every important imported-data cascade below resource A.
            cost_a = CostRecord(
                cloud_account_id=account_a.id,
                resource_id=resource_a.id,
                usage_date=now.date(),
                service="Amazon EC2",
                cost_type="resource_direct",
                amount=Decimal("12.34"),
                currency="USD",
                is_estimated=False,
            )

            metric_a = MetricSample(
                resource_id=resource_a.id,
                namespace="AWS/EC2",
                metric_name="CPUUtilization",
                statistic="Average",
                value=25.0,
                unit="Percent",
                timestamp=now,
                period_seconds=300,
            )

            incident_a = Incident(
                resource_id=resource_a.id,
                severity="medium",
                title="Removal cascade incident",
                description="Test-only incident.",
                status="open",
                started_at=now,
                assigned_user_id=None,
                source="manual",
            )

            recommendation_a = Recommendation(
                resource_id=resource_a.id,
                recommendation_type="rightsizing",
                title="Removal cascade recommendation",
                description="Test-only recommendation.",
                evidence="Test-only evidence.",
                estimated_monthly_savings=Decimal("10.00"),
                risk="low",
                confidence="high",
                status="open",
            )

            tag_a = ResourceTag(
                resource_id=resource_a.id,
                key="Environment",
                value="test",
            )

            # Account-scoped budgets are textual references and therefore need
            # explicit application cleanup.
            account_budget_a = Budget(
                organization_id=organization_a.id,
                name="Account A Budget",
                scope_type="account",
                scope_value=str(account_a.id),
                monthly_limit=Decimal("100.00"),
                warning_threshold=80,
                critical_threshold=100,
                is_active=True,
                created_by_id=user_a.id,
            )

            # A non-account budget inside the same tenant must survive.
            service_budget_a = Budget(
                organization_id=organization_a.id,
                name="Service Budget A",
                scope_type="service",
                scope_value="Amazon EC2",
                monthly_limit=Decimal("200.00"),
                warning_threshold=80,
                critical_threshold=100,
                is_active=True,
                created_by_id=user_a.id,
            )

            # Another tenant's account budget must also survive.
            account_budget_b = Budget(
                organization_id=organization_b.id,
                name="Account B Budget",
                scope_type="account",
                scope_value=str(account_b.id),
                monthly_limit=Decimal("300.00"),
                warning_threshold=80,
                critical_threshold=100,
                is_active=True,
                created_by_id=user_b.id,
            )

            session.add_all(
                [
                    cost_a,
                    metric_a,
                    incident_a,
                    recommendation_a,
                    tag_a,
                    account_budget_a,
                    service_budget_a,
                    account_budget_b,
                ]
            )

            await session.commit()

            # Capture identifiers before destructive deletion.
            account_a_id = account_a.id
            account_b_id = account_b.id
            resource_a_id = resource_a.id
            resource_b_id = resource_b.id
            cost_a_id = cost_a.id
            metric_a_id = metric_a.id
            incident_a_id = incident_a.id
            recommendation_a_id = recommendation_a.id
            tag_a_id = tag_a.id
            account_budget_a_id = account_budget_a.id
            service_budget_a_id = service_budget_a.id
            account_budget_b_id = account_budget_b.id
            user_a_id = user_a.id
            organization_a_id = organization_a.id

            old_revision = account_a.connection_revision

            tenant_a = TenantContext(
                organization_id=organization_a.id,
                membership_id=membership_a.id,
                user_id=user_a.id,
                role="owner",
            )

            tenant_b = TenantContext(
                organization_id=organization_b.id,
                membership_id=membership_b.id,
                user_id=user_b.id,
                role="owner",
            )

            payload = CloudAccountRemovalRequest(
                confirmation="REMOVE",
            )

            # Tenant B must not be able to remove tenant A's integration.
            with pytest.raises(HTTPException) as cross_tenant_error:
                await remove_cloud_account(
                    account_id=account_a_id,
                    payload=payload,
                    tenant=tenant_b,
                    session=session,
                )

            assert cross_tenant_error.value.status_code == 404

            # The rightful tenant can permanently remove its integration.
            result = await remove_cloud_account(
                account_id=account_a_id,
                payload=payload,
                tenant=tenant_a,
                session=session,
            )

            assert result.account_id == account_a_id
            assert result.account_budgets_deleted == 1

            # The target cloud account itself is permanently gone.
            assert (
                await session.scalar(
                    select(CloudAccount.id).where(
                        CloudAccount.id == account_a_id,
                    )
                )
                is None
            )

            # Direct cloud-account children must cascade.
            assert (
                await session.scalar(
                    select(CloudResource.id).where(
                        CloudResource.id == resource_a_id,
                    )
                )
                is None
            )

            assert (
                await session.scalar(
                    select(CostRecord.id).where(
                        CostRecord.id == cost_a_id,
                    )
                )
                is None
            )

            # Resource-owned imported records must also cascade.
            assert (
                await session.scalar(
                    select(MetricSample.id).where(
                        MetricSample.id == metric_a_id,
                    )
                )
                is None
            )

            assert (
                await session.scalar(
                    select(Incident.id).where(
                        Incident.id == incident_a_id,
                    )
                )
                is None
            )

            assert (
                await session.scalar(
                    select(Recommendation.id).where(
                        Recommendation.id == recommendation_a_id,
                    )
                )
                is None
            )

            assert (
                await session.scalar(
                    select(ResourceTag.id).where(
                        ResourceTag.id == tag_a_id,
                    )
                )
                is None
            )

            # The account-scoped budget is explicitly removed.
            assert (
                await session.scalar(
                    select(Budget.id).where(
                        Budget.id == account_budget_a_id,
                    )
                )
                is None
            )

            # Unrelated budget scope inside the same organization survives.
            assert (
                await session.scalar(
                    select(Budget.id).where(
                        Budget.id == service_budget_a_id,
                    )
                )
                == service_budget_a_id
            )

            # The user's CloudOps identity/workspace also survives this action.
            assert (
                await session.scalar(
                    select(User.id).where(
                        User.id == user_a_id,
                    )
                )
                == user_a_id
            )

            assert (
                await session.scalar(
                    select(Organization.id).where(
                        Organization.id == organization_a_id,
                    )
                )
                == organization_a_id
            )

            # Tenant B and all checked tenant-B data remain untouched.
            assert (
                await session.scalar(
                    select(CloudAccount.id).where(
                        CloudAccount.id == account_b_id,
                    )
                )
                == account_b_id
            )

            assert (
                await session.scalar(
                    select(CloudResource.id).where(
                        CloudResource.id == resource_b_id,
                    )
                )
                == resource_b_id
            )

            assert (
                await session.scalar(
                    select(Budget.id).where(
                        Budget.id == account_budget_b_id,
                    )
                )
                == account_budget_b_id
            )

            # Any queued AWS task targeting the removed generation is stale.
            with pytest.raises(StaleCloudAccountConnectionError):
                await require_connection_revision(
                    session,
                    account_id=account_a_id,
                    expected_revision=old_revision,
                    required_status="connected",
                )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_removing_integration_blocks_reconnect_disconnect_and_validation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A committed removal boundary must not be reopened by another action."""

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
                email="removing-owner@example.com",
                full_name="Removing Owner",
                password_hash="test-only",
                role="viewer",
                is_active=True,
            )

            organization = Organization(
                name="Removing Organization",
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
                name="Removing AWS",
                external_account_id="757575757575",
                role_arn=("arn:aws:iam::757575757575:role/CloudOpsInsightReadOnlyRole"),
                external_id="coi_removing",
                enabled_regions=[
                    "eu-central-1",
                ],
                status="removing",
                sync_status="idle",
                connection_revision=9,
                created_by_id=user.id,
            )

            session.add_all(
                [
                    membership,
                    account,
                ]
            )

            await session.commit()

            account_id = account.id

            tenant = TenantContext(
                organization_id=organization.id,
                membership_id=membership.id,
                user_id=user.id,
                role="owner",
            )

            def unexpected_validation_call(
                *_args,
                **_kwargs,
            ):
                raise AssertionError(
                    "AWS validation was called for a removing integration.",
                )

            monkeypatch.setattr(
                AwsConnectionService,
                "validate_account",
                unexpected_validation_call,
            )

            # A role PATCH used to be able to move a removing integration
            # back to pending. The lifecycle guard must reject it instead.
            with pytest.raises(HTTPException) as update_error:
                await update_cloud_account(
                    account_id=account_id,
                    payload=CloudAccountUpdate(
                        role_arn=(
                            "arn:aws:iam::757575757575:role/CloudOpsInsightReadOnlyRole"
                        ),
                    ),
                    tenant=tenant,
                    session=session,
                )

            assert update_error.value.status_code == 409

            await session.refresh(
                account,
            )

            assert account.status == "removing"
            assert account.connection_revision == 9

            # Disconnect must never overwrite the removal boundary.
            with pytest.raises(HTTPException) as disconnect_error:
                await disconnect_cloud_account(
                    account_id=account_id,
                    tenant=tenant,
                    session=session,
                )

            assert disconnect_error.value.status_code == 409

            await session.refresh(
                account,
            )

            assert account.status == "removing"
            assert account.connection_revision == 9

            # Validation must stop before STS/AWS is reached.
            with pytest.raises(HTTPException) as validation_error:
                await validate_cloud_account(
                    account_id=account_id,
                    tenant=tenant,
                    session=session,
                )

            assert validation_error.value.status_code == 409

            await session.refresh(
                account,
            )

            assert account.status == "removing"
            assert account.connection_revision == 9

            # A retry of the original destructive action remains valid.
            result = await remove_cloud_account(
                account_id=account_id,
                payload=CloudAccountRemovalRequest(
                    confirmation="REMOVE",
                ),
                tenant=tenant,
                session=session,
            )

            assert result.account_id == account_id
            assert result.account_budgets_deleted == 0

            assert (
                await session.scalar(
                    select(CloudAccount.id).where(
                        CloudAccount.id == account_id,
                    )
                )
                is None
            )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_remove_takes_over_persisted_disconnecting_account() -> None:
    """Permanent removal must recover an interrupted disconnect lifecycle."""

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
                email=f"remove-disconnecting-{uuid4().hex}@example.com",
                full_name="Removal Disconnecting Owner",
                password_hash="test-only",
                role="viewer",
                is_active=True,
            )

            organization = Organization(
                name=f"Removal Disconnecting {uuid4().hex}",
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
                name="Interrupted Disconnect AWS",
                external_account_id=(f"{uuid4().int % 1_000_000_000_000:012d}"),
                role_arn=("arn:aws:iam::767676767676:role/CloudOpsInsightReadOnlyRole"),
                external_id=f"coi_disconnect_takeover_{uuid4().hex}",
                enabled_regions=[
                    "eu-central-1",
                ],
                status="disconnecting",
                sync_status="idle",
                connection_revision=4,
                created_by_id=user.id,
            )

            session.add_all(
                [
                    membership,
                    account,
                ]
            )

            await session.commit()

            account_id = account.id

            tenant = TenantContext(
                organization_id=organization.id,
                membership_id=membership.id,
                user_id=user.id,
                role="owner",
            )

            result = await remove_cloud_account(
                account_id=account_id,
                payload=CloudAccountRemovalRequest(
                    confirmation="REMOVE",
                ),
                tenant=tenant,
                session=session,
            )

            assert result.account_id == account_id
            assert result.account_budgets_deleted == 0

            # A persisted disconnecting state must never trap the
            # integration. Permanent removal takes ownership of the
            # lifecycle, establishes a new revision boundary, then deletes.
            assert (
                await session.scalar(
                    select(
                        CloudAccount.id,
                    ).where(
                        CloudAccount.id == account_id,
                    )
                )
                is None
            )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_deleted_integration_worker_tasks_skip_before_aws_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Deleted integrations must become stale before any AWS provider call."""

    deleted_account_id = uuid4()

    def unexpected_aws_call(
        *_args,
        **_kwargs,
    ):
        raise AssertionError(
            "AWS provider call occurred for a deleted integration.",
        )

    # Resource sync reaches AWS through discovery. The missing integration
    # must fail its connection-generation guard before discovery starts.
    monkeypatch.setattr(
        AwsDiscoveryService,
        "discover_account",
        unexpected_aws_call,
    )

    # Metric and cost sync create an AWS account session only after their
    # initial connection-generation guard succeeds.
    monkeypatch.setattr(
        AwsSessionFactory,
        "create_account_session",
        unexpected_aws_call,
    )

    account_result = await _run_account_sync(
        str(
            deleted_account_id,
        ),
        0,
    )

    metric_result = await _run_metric_sync(
        str(
            deleted_account_id,
        ),
        0,
    )

    cost_result = await _run_cost_sync(
        str(
            deleted_account_id,
        ),
        0,
    )

    expected = {
        "account_id": str(
            deleted_account_id,
        ),
        "status": "skipped_stale",
    }

    assert account_result == expected
    assert metric_result == expected
    assert cost_result == expected
