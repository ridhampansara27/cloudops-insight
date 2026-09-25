"""Real PostgreSQL regression tests for SaaS tenant isolation."""

import os
from datetime import UTC, datetime
from decimal import Decimal

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.api.v1.budgets import (
    create_budget,
    delete_budget,
    list_budgets,
    update_budget,
)
from app.api.v1.cloud_accounts import (
    get_cloud_account,
    list_cloud_accounts,
)
from app.api.v1.costs import get_cost_summary
from app.api.v1.dashboard import get_dashboard_summary
from app.api.v1.incidents import (
    list_incidents,
    update_incident_status,
)
from app.api.v1.recommendations import (
    list_recommendations,
    update_recommendation_status,
)
from app.api.v1.resources import (
    get_resource,
    get_resource_metrics,
    list_resources,
)
from app.core.security import (
    create_access_token,
    password_state_version,
)
from app.core.tenancy import TenantContext
from app.db.session import get_db_session
from app.main import app
from app.models.budget import Budget
from app.models.cloud_account import CloudAccount
from app.models.cost import CostRecord
from app.models.incident import Incident
from app.models.metric import MetricSample
from app.models.organization import Organization, OrganizationMembership
from app.models.recommendation import Recommendation
from app.models.resource import CloudResource
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetUpdate
from app.schemas.incident import IncidentStatusUpdate
from app.schemas.recommendation import RecommendationStatusUpdate

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason=(
        "TENANT_TEST_DATABASE_URL is required for the real "
        "PostgreSQL tenant-isolation regression test."
    ),
)


async def expect_http_status(
    awaitable,
    expected_status: int,
    label: str,
) -> None:
    """Require one attack request to fail with the expected HTTP status."""

    try:
        await awaitable

    except HTTPException as error:
        assert error.status_code == expected_status, (
            f"{label}: expected HTTP {expected_status}, received {error.status_code}"
        )

    else:
        raise AssertionError(f"{label}: cross-tenant operation unexpectedly succeeded")


@pytest.mark.asyncio
async def test_customer_data_is_strictly_isolated_between_two_organizations() -> None:
    """Prove Tenant A cannot read or mutate Tenant B customer data."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        # Keep the entire attack test inside one outer transaction.
        #
        # Application endpoint functions are allowed to call commit().
        # create_savepoint keeps those commits inside this outer
        # transaction so the whole test can be rolled back afterwards.
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

            # ==================================================
            # TENANT A + TENANT B IDENTITIES
            # ==================================================

            user_a = User(
                email="permanent-tenant-a@example.com",
                full_name="Permanent Tenant A",
                password_hash="test-only",
                role="viewer",
                is_active=True,
                email_verified_at=now,
                password_changed_at=now,
            )

            user_b = User(
                email="permanent-tenant-b@example.com",
                full_name="Permanent Tenant B",
                password_hash="test-only",
                role="viewer",
                is_active=True,
                email_verified_at=now,
                password_changed_at=now,
            )

            org_a = Organization(
                name="Permanent Tenant A",
            )

            org_b = Organization(
                name="Permanent Tenant B",
            )

            session.add_all(
                [
                    user_a,
                    user_b,
                    org_a,
                    org_b,
                ]
            )

            await session.flush()

            membership_a = OrganizationMembership(
                organization_id=org_a.id,
                user_id=user_a.id,
                role="owner",
                is_active=True,
            )

            membership_b = OrganizationMembership(
                organization_id=org_b.id,
                user_id=user_b.id,
                role="owner",
                is_active=True,
            )

            # ==================================================
            # AWS ACCOUNTS
            # ==================================================

            account_a = CloudAccount(
                organization_id=org_a.id,
                provider="aws",
                name="Tenant A AWS",
                external_account_id="555555555555",
                enabled_regions=[
                    "eu-central-1",
                ],
                status="connected",
                sync_status="idle",
                created_by_id=user_a.id,
            )

            account_b = CloudAccount(
                organization_id=org_b.id,
                provider="aws",
                name="Tenant B AWS",
                external_account_id="666666666666",
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

            # ==================================================
            # RESOURCES
            # ==================================================

            resource_a = CloudResource(
                cloud_account_id=account_a.id,
                provider_resource_id="i-permanent-a",
                name="Tenant A Instance",
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
                provider_resource_id="i-permanent-b",
                name="Tenant B Instance",
                service="EC2",
                resource_type="AWS::EC2::Instance",
                region="eu-central-1",
                cloud_state="running",
                health_state="critical",
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

            # ==================================================
            # COSTS
            #
            # Deliberately use the SAME AWS service.
            #
            # A = 10
            # B = 999
            #
            # This catches regression of the original service-budget
            # cross-tenant aggregation vulnerability.
            # ==================================================

            cost_a = CostRecord(
                cloud_account_id=account_a.id,
                usage_date=now.date(),
                service="Amazon EC2",
                cost_type="service_aggregate",
                amount=Decimal("10.00"),
                currency="USD",
                is_estimated=False,
            )

            cost_b = CostRecord(
                cloud_account_id=account_b.id,
                usage_date=now.date(),
                service="Amazon EC2",
                cost_type="service_aggregate",
                amount=Decimal("999.00"),
                currency="USD",
                is_estimated=False,
            )

            # ==================================================
            # METRICS
            # ==================================================

            metric_a = MetricSample(
                resource_id=resource_a.id,
                namespace="AWS/EC2",
                metric_name="CPUUtilization",
                statistic="Average",
                value=12.5,
                unit="Percent",
                timestamp=now,
                period_seconds=300,
            )

            metric_b = MetricSample(
                resource_id=resource_b.id,
                namespace="AWS/EC2",
                metric_name="CPUUtilization",
                statistic="Average",
                value=99.0,
                unit="Percent",
                timestamp=now,
                period_seconds=300,
            )

            # ==================================================
            # INCIDENTS
            # ==================================================

            incident_a = Incident(
                resource_id=resource_a.id,
                severity="medium",
                title="Tenant A Incident",
                status="open",
                started_at=now,
                source="monitoring",
            )

            incident_b = Incident(
                resource_id=resource_b.id,
                severity="critical",
                title="Tenant B Incident",
                status="open",
                started_at=now,
                source="monitoring",
            )

            # ==================================================
            # RECOMMENDATIONS
            # ==================================================

            recommendation_a = Recommendation(
                resource_id=resource_a.id,
                recommendation_type="rightsizing",
                title="Tenant A Recommendation",
                description="Tenant A only",
                evidence="Tenant A evidence",
                estimated_monthly_savings=Decimal(
                    "25.00",
                ),
                risk="low",
                confidence="high",
                status="open",
            )

            recommendation_b = Recommendation(
                resource_id=resource_b.id,
                recommendation_type="rightsizing",
                title="Tenant B Recommendation",
                description="Tenant B only",
                evidence="Tenant B evidence",
                estimated_monthly_savings=Decimal(
                    "777.00",
                ),
                risk="high",
                confidence="high",
                status="open",
            )

            # ==================================================
            # TENANT B BUDGET
            # ==================================================

            budget_b = Budget(
                organization_id=org_b.id,
                name="Tenant B EC2 Budget",
                scope_type="service",
                scope_value="Amazon EC2",
                monthly_limit=Decimal(
                    "1000.00",
                ),
                warning_threshold=80,
                critical_threshold=100,
                created_by_id=user_b.id,
            )

            session.add_all(
                [
                    cost_a,
                    cost_b,
                    metric_a,
                    metric_b,
                    incident_a,
                    incident_b,
                    recommendation_a,
                    recommendation_b,
                    budget_b,
                ]
            )

            await session.commit()

            tenant_a = TenantContext(
                organization_id=org_a.id,
                membership_id=membership_a.id,
                user_id=user_a.id,
                role="owner",
            )

            # ==================================================
            # CLOUD ACCOUNT ISOLATION
            # ==================================================

            accounts_a = await list_cloud_accounts(
                tenant=tenant_a,
                session=session,
            )

            assert len(accounts_a) == 1
            assert accounts_a[0].id == account_a.id

            await expect_http_status(
                get_cloud_account(
                    account_id=account_b.id,
                    tenant=tenant_a,
                    session=session,
                ),
                404,
                "cloud-account UUID probe",
            )

            # ==================================================
            # RESOURCE ISOLATION
            # ==================================================

            resources_a = await list_resources(
                tenant=tenant_a,
                session=session,
                page=1,
                page_size=100,
                search=None,
                service=None,
                environment=None,
                health_state=None,
            )

            assert resources_a.total == 1
            assert len(resources_a.items) == 1
            assert resources_a.items[0].id == resource_a.id

            await expect_http_status(
                get_resource(
                    resource_id=resource_b.id,
                    tenant=tenant_a,
                    session=session,
                ),
                404,
                "resource UUID probe",
            )

            # ==================================================
            # METRIC ISOLATION
            # ==================================================

            metrics_a = await get_resource_metrics(
                resource_id=resource_a.id,
                tenant=tenant_a,
                session=session,
                hours=24,
            )

            assert len(metrics_a) == 1
            assert metrics_a[0].points[0].value == 12.5

            await expect_http_status(
                get_resource_metrics(
                    resource_id=resource_b.id,
                    tenant=tenant_a,
                    session=session,
                    hours=24,
                ),
                404,
                "metric UUID probe",
            )

            # ==================================================
            # COST ISOLATION
            # ==================================================

            costs_a = await get_cost_summary(
                tenant=tenant_a,
                session=session,
            )

            assert costs_a.month_to_date == 10.0

            assert all(service.amount != 999.0 for service in costs_a.by_service)

            # ==================================================
            # DASHBOARD ISOLATION
            # ==================================================

            dashboard_a = await get_dashboard_summary(
                tenant=tenant_a,
                session=session,
            )

            assert dashboard_a.total_resources == 1
            assert dashboard_a.healthy_resources == 1
            assert dashboard_a.warning_resources == 0
            assert dashboard_a.critical_resources == 0

            assert dashboard_a.active_incidents == 1
            assert dashboard_a.month_to_date_cost == 10.0

            assert dashboard_a.potential_monthly_savings == 25.0

            # ==================================================
            # SERVICE BUDGET ISOLATION
            # ==================================================

            budget_a = await create_budget(
                payload=BudgetCreate(
                    name="Tenant A EC2 Budget",
                    scope_type="service",
                    scope_value="Amazon EC2",
                    monthly_limit=Decimal(
                        "100.00",
                    ),
                    warning_threshold=80,
                    critical_threshold=100,
                ),
                tenant=tenant_a,
                session=session,
            )

            assert budget_a.current_spend == Decimal(
                "10.000000",
            )

            # ==================================================
            # ACCOUNT-SCOPE BUDGET ATTACK
            # ==================================================

            await expect_http_status(
                create_budget(
                    payload=BudgetCreate(
                        name="Illegal Tenant B Account Budget",
                        scope_type="account",
                        scope_value=str(
                            account_b.id,
                        ),
                        monthly_limit=Decimal(
                            "100.00",
                        ),
                        warning_threshold=80,
                        critical_threshold=100,
                    ),
                    tenant=tenant_a,
                    session=session,
                ),
                422,
                "cross-tenant account-budget creation",
            )

            # ==================================================
            # BUDGET LIST ISOLATION
            # ==================================================

            budgets_a = await list_budgets(
                tenant=tenant_a,
                session=session,
            )

            assert len(budgets_a) == 1
            assert budgets_a[0].id == budget_a.id
            assert budgets_a[0].current_spend == Decimal(
                "10.000000",
            )

            # ==================================================
            # REAL HTTP TENANT-BOUNDARY REGRESSION
            #
            # The assertions above exercise the endpoint functions
            # directly. This block now proves the same boundaries
            # through FastAPI routing, JWT authentication, tenant
            # resolution, request parsing, and response serialization.
            # ==================================================

            # Build genuine application access tokens bound to each
            # user's current password state.
            token_a = create_access_token(
                str(user_a.id),
                password_version=password_state_version(
                    user_a.password_changed_at,
                ),
            )

            token_b = create_access_token(
                str(user_b.id),
                password_version=password_state_version(
                    user_b.password_changed_at,
                ),
            )

            # Reuse this test's transaction-bound AsyncSession for
            # HTTP requests. That makes every HTTP assertion observe
            # the exact same isolated Tenant A / Tenant B dataset.
            async def override_db_session():
                yield session

            # Replace only FastAPI's normal DB dependency for the
            # duration of this HTTP regression block.
            app.dependency_overrides[get_db_session] = override_db_session

            try:
                # Send requests directly to FastAPI without opening
                # a TCP port or contacting any external service.
                transport = httpx.ASGITransport(
                    app=app,
                )

                async with httpx.AsyncClient(
                    transport=transport,
                    base_url="http://domain-tenant-boundary-test",
                ) as client:
                    # Tenant A may explicitly select only Tenant A.
                    headers_a = {
                        "Authorization": f"Bearer {token_a}",
                        "X-Organization-ID": str(org_a.id),
                    }

                    # Tenant B may explicitly select only Tenant B.
                    headers_b = {
                        "Authorization": f"Bearer {token_b}",
                        "X-Organization-ID": str(org_b.id),
                    }

                    # ==============================================
                    # RESOURCE LIST ISOLATION
                    # ==============================================

                    resources_http_a = await client.get(
                        "/api/v1/resources",
                        headers=headers_a,
                        params={
                            "page": 1,
                            "page_size": 100,
                        },
                    )

                    assert resources_http_a.status_code == 200

                    resources_payload_a = resources_http_a.json()

                    assert resources_payload_a["total"] == 1
                    assert len(resources_payload_a["items"]) == 1
                    assert resources_payload_a["items"][0]["id"] == str(resource_a.id)

                    # Positive control: Tenant B can see its own
                    # resource, proving Tenant B's object really exists.
                    resource_http_b = await client.get(
                        f"/api/v1/resources/{resource_b.id}",
                        headers=headers_b,
                    )

                    assert resource_http_b.status_code == 200
                    assert resource_http_b.json()["id"] == str(resource_b.id)

                    # Tenant A must not enumerate Tenant B's resource.
                    foreign_resource = await client.get(
                        f"/api/v1/resources/{resource_b.id}",
                        headers=headers_a,
                    )

                    assert foreign_resource.status_code == 404

                    # ==============================================
                    # METRIC ISOLATION
                    # ==============================================

                    own_metrics = await client.get(
                        f"/api/v1/resources/{resource_a.id}/metrics",
                        headers=headers_a,
                    )

                    assert own_metrics.status_code == 200

                    own_metric_payload = own_metrics.json()

                    assert len(own_metric_payload) == 1
                    assert own_metric_payload[0]["points"][0]["value"] == 12.5

                    # A foreign resource UUID must fail before its
                    # metric samples can be queried.
                    foreign_metrics = await client.get(
                        f"/api/v1/resources/{resource_b.id}/metrics",
                        headers=headers_a,
                    )

                    assert foreign_metrics.status_code == 404

                    # ==============================================
                    # COST AGGREGATE ISOLATION
                    #
                    # Tenant A owns USD 10 while Tenant B owns USD 999.
                    # ==============================================

                    costs_http_a = await client.get(
                        "/api/v1/costs/summary",
                        headers=headers_a,
                    )

                    assert costs_http_a.status_code == 200

                    costs_payload_a = costs_http_a.json()

                    assert costs_payload_a["month_to_date"] == 10.0
                    assert all(
                        entry["amount"] != 999.0
                        for entry in costs_payload_a["by_service"]
                    )

                    # Positive control proves the 999 value is
                    # genuinely present for Tenant B.
                    costs_http_b = await client.get(
                        "/api/v1/costs/summary",
                        headers=headers_b,
                    )

                    assert costs_http_b.status_code == 200
                    assert costs_http_b.json()["month_to_date"] == 999.0

                    # ==============================================
                    # DASHBOARD AGGREGATE ISOLATION
                    # ==============================================

                    dashboard_http_a = await client.get(
                        "/api/v1/dashboard/summary",
                        headers=headers_a,
                    )

                    assert dashboard_http_a.status_code == 200

                    dashboard_payload_a = dashboard_http_a.json()

                    assert dashboard_payload_a["total_resources"] == 1
                    assert dashboard_payload_a["healthy_resources"] == 1
                    assert dashboard_payload_a["critical_resources"] == 0
                    assert dashboard_payload_a["active_incidents"] == 1
                    assert dashboard_payload_a["month_to_date_cost"] == 10.0
                    assert dashboard_payload_a["potential_monthly_savings"] == 25.0

                    # Positive control proves Tenant B's critical
                    # resource, cost, incident, and savings exist.
                    dashboard_http_b = await client.get(
                        "/api/v1/dashboard/summary",
                        headers=headers_b,
                    )

                    assert dashboard_http_b.status_code == 200

                    dashboard_payload_b = dashboard_http_b.json()

                    assert dashboard_payload_b["total_resources"] == 1
                    assert dashboard_payload_b["critical_resources"] == 1
                    assert dashboard_payload_b["month_to_date_cost"] == 999.0
                    assert dashboard_payload_b["potential_monthly_savings"] == 777.0

                    # ==============================================
                    # BUDGET LIST ISOLATION
                    # ==============================================

                    budgets_http_a = await client.get(
                        "/api/v1/budgets",
                        headers=headers_a,
                    )

                    assert budgets_http_a.status_code == 200

                    budgets_payload_a = budgets_http_a.json()

                    assert len(budgets_payload_a) == 1
                    assert budgets_payload_a[0]["id"] == str(budget_a.id)

                    budgets_http_b = await client.get(
                        "/api/v1/budgets",
                        headers=headers_b,
                    )

                    assert budgets_http_b.status_code == 200

                    budgets_payload_b = budgets_http_b.json()

                    assert len(budgets_payload_b) == 1
                    assert budgets_payload_b[0]["id"] == str(budget_b.id)

                    # Positive write control: Tenant A may update its
                    # own budget through the authenticated API.
                    own_budget_update = await client.patch(
                        f"/api/v1/budgets/{budget_a.id}",
                        headers=headers_a,
                        json={
                            "name": "Tenant A HTTP Budget",
                        },
                    )

                    assert own_budget_update.status_code == 200
                    assert own_budget_update.json()["name"] == "Tenant A HTTP Budget"

                    # Tenant A cannot update Tenant B's budget UUID.
                    foreign_budget_update = await client.patch(
                        f"/api/v1/budgets/{budget_b.id}",
                        headers=headers_a,
                        json={
                            "name": "ILLEGAL TENANT A UPDATE",
                        },
                    )

                    assert foreign_budget_update.status_code == 404

                    # Tenant A cannot delete Tenant B's budget.
                    foreign_budget_delete = await client.delete(
                        f"/api/v1/budgets/{budget_b.id}",
                        headers=headers_a,
                    )

                    assert foreign_budget_delete.status_code == 404

                    # Tenant A also cannot create an account-scoped
                    # budget referring to Tenant B's cloud account.
                    foreign_account_budget = await client.post(
                        "/api/v1/budgets",
                        headers=headers_a,
                        json={
                            "name": "Illegal Tenant B Account Budget",
                            "scope_type": "account",
                            "scope_value": str(account_b.id),
                            "monthly_limit": "100.00",
                            "warning_threshold": 80,
                            "critical_threshold": 100,
                        },
                    )

                    assert foreign_account_budget.status_code == 422

                    # ==============================================
                    # INCIDENT LIST + WRITE ISOLATION
                    # ==============================================

                    incidents_http_a = await client.get(
                        "/api/v1/incidents",
                        headers=headers_a,
                    )

                    assert incidents_http_a.status_code == 200

                    incidents_payload_a = incidents_http_a.json()

                    assert len(incidents_payload_a) == 1
                    assert incidents_payload_a[0]["id"] == str(incident_a.id)

                    incidents_http_b = await client.get(
                        "/api/v1/incidents",
                        headers=headers_b,
                    )

                    assert incidents_http_b.status_code == 200
                    assert len(incidents_http_b.json()) == 1
                    assert incidents_http_b.json()[0]["id"] == str(incident_b.id)

                    # Positive write control for Tenant A.
                    own_incident_update = await client.patch(
                        f"/api/v1/incidents/{incident_a.id}/status",
                        headers=headers_a,
                        json={
                            "status": "investigating",
                        },
                    )

                    assert own_incident_update.status_code == 200
                    assert own_incident_update.json()["status"] == "investigating"

                    # Tenant A cannot mutate Tenant B's incident.
                    foreign_incident_update = await client.patch(
                        f"/api/v1/incidents/{incident_b.id}/status",
                        headers=headers_a,
                        json={
                            "status": "resolved",
                        },
                    )

                    assert foreign_incident_update.status_code == 404

                    # ==============================================
                    # RECOMMENDATION LIST + WRITE ISOLATION
                    # ==============================================

                    recommendations_http_a = await client.get(
                        "/api/v1/recommendations",
                        headers=headers_a,
                    )

                    assert recommendations_http_a.status_code == 200

                    recommendations_payload_a = recommendations_http_a.json()

                    assert len(recommendations_payload_a) == 1
                    assert recommendations_payload_a[0]["id"] == str(
                        recommendation_a.id
                    )

                    recommendations_http_b = await client.get(
                        "/api/v1/recommendations",
                        headers=headers_b,
                    )

                    assert recommendations_http_b.status_code == 200
                    assert len(recommendations_http_b.json()) == 1
                    assert recommendations_http_b.json()[0]["id"] == str(
                        recommendation_b.id
                    )

                    # Positive write control for Tenant A.
                    own_recommendation_update = await client.patch(
                        (f"/api/v1/recommendations/{recommendation_a.id}/status"),
                        headers=headers_a,
                        json={
                            "status": "accepted",
                        },
                    )

                    assert own_recommendation_update.status_code == 200
                    assert own_recommendation_update.json()["status"] == "accepted"

                    # Tenant A cannot mutate Tenant B's recommendation.
                    foreign_recommendation_update = await client.patch(
                        (f"/api/v1/recommendations/{recommendation_b.id}/status"),
                        headers=headers_a,
                        json={
                            "status": "dismissed",
                        },
                    )

                    assert foreign_recommendation_update.status_code == 404

                # Refresh protected Tenant B records from PostgreSQL
                # after every HTTP attack.
                await session.refresh(
                    budget_b,
                )
                await session.refresh(
                    incident_b,
                )
                await session.refresh(
                    recommendation_b,
                )

                # Cross-tenant HTTP requests must not mutate Tenant B.
                assert budget_b.name == "Tenant B EC2 Budget"
                assert incident_b.status == "open"
                assert recommendation_b.status == "open"

            finally:
                # Never allow a dependency override to leak into another
                # pytest test, even when an assertion fails.
                app.dependency_overrides.pop(
                    get_db_session,
                    None,
                )

            # ==================================================
            # BUDGET UUID ATTACKS
            # ==================================================

            await expect_http_status(
                update_budget(
                    budget_id=budget_b.id,
                    payload=BudgetUpdate(
                        name="Illegal Cross-Tenant Update",
                    ),
                    tenant=tenant_a,
                    session=session,
                ),
                404,
                "cross-tenant budget update",
            )

            await session.refresh(
                budget_b,
            )

            assert budget_b.name == "Tenant B EC2 Budget"

            await expect_http_status(
                delete_budget(
                    budget_id=budget_b.id,
                    tenant=tenant_a,
                    session=session,
                ),
                404,
                "cross-tenant budget delete",
            )

            assert (
                await session.scalar(
                    select(
                        Budget,
                    ).where(
                        Budget.id == budget_b.id,
                    )
                )
                is not None
            )

            # ==================================================
            # INCIDENT ISOLATION
            # ==================================================

            incidents_a = await list_incidents(
                tenant=tenant_a,
                session=session,
                severity=None,
                incident_status=None,
            )

            assert len(incidents_a) == 1
            assert incidents_a[0].id == incident_a.id

            await expect_http_status(
                update_incident_status(
                    incident_id=incident_b.id,
                    payload=IncidentStatusUpdate(
                        status="resolved",
                    ),
                    tenant=tenant_a,
                    session=session,
                ),
                404,
                "cross-tenant incident mutation",
            )

            await session.refresh(
                incident_b,
            )

            assert incident_b.status == "open"

            own_incident = await update_incident_status(
                incident_id=incident_a.id,
                payload=IncidentStatusUpdate(
                    status="acknowledged",
                ),
                tenant=tenant_a,
                session=session,
            )

            assert own_incident.status == "acknowledged"

            # ==================================================
            # RECOMMENDATION ISOLATION
            # ==================================================

            recommendations_a = await list_recommendations(
                tenant=tenant_a,
                session=session,
                recommendation_status=None,
                risk=None,
            )

            assert len(recommendations_a) == 1
            assert recommendations_a[0].id == recommendation_a.id

            await expect_http_status(
                update_recommendation_status(
                    recommendation_id=recommendation_b.id,
                    payload=RecommendationStatusUpdate(
                        status="dismissed",
                    ),
                    tenant=tenant_a,
                    session=session,
                ),
                404,
                "cross-tenant recommendation mutation",
            )

            await session.refresh(
                recommendation_b,
            )

            assert recommendation_b.status == "open"

            own_recommendation = await update_recommendation_status(
                recommendation_id=recommendation_a.id,
                payload=RecommendationStatusUpdate(
                    status="accepted",
                ),
                tenant=tenant_a,
                session=session,
            )

            assert own_recommendation.status == "accepted"

        finally:
            await session.close()

            # Remove every test record even when an assertion fails.
            await outer_transaction.rollback()

    await engine.dispose()
