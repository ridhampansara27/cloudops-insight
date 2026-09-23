"""PostgreSQL regression for monitoring generation-lock transaction ownership."""

import os
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.models.cloud_account import CloudAccount
from app.models.organization import Organization
from app.models.recommendation import Recommendation
from app.models.resource import CloudResource
from app.providers.aws.cloudwatch import CloudWatchProvider
from app.providers.aws.monitoring_types import AwsMetricPoint
from app.providers.aws.session import AwsSessionFactory
from app.services.monitoring_sync_service import MonitoringSyncService

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)

pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


@pytest.mark.asyncio
async def test_monitoring_sync_owns_single_commit_after_generation_lock(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The final generation lock must survive until monitoring's final commit."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    Session = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    suffix = uuid4().hex[:12]

    account_id = None
    organization_id = None

    try:
        # ------------------------------------------------------
        # Persist one connected account and one active EC2 resource.
        #
        # IDs backed by SQLAlchemy defaults are assigned at flush time,
        # so construct FK-dependent rows only after the parent is flushed.
        # ------------------------------------------------------
        async with Session() as setup_session:
            organization = Organization(
                name=f"Monitoring Lock Organization {suffix}",
            )

            setup_session.add(
                organization,
            )

            await setup_session.flush()

            assert organization.id is not None

            organization_id = organization.id

            account = CloudAccount(
                organization_id=organization.id,
                provider="aws",
                name="Monitoring Lock AWS",
                external_account_id=f"{uuid4().int % 1_000_000_000_000:012d}",
                role_arn=("arn:aws:iam::123456789012:role/CloudOpsInsightReadOnlyRole"),
                external_id=f"coi_monitoring_lock_{suffix}",
                enabled_regions=[
                    "eu-central-1",
                ],
                status="connected",
                sync_status="idle",
                connection_revision=11,
                created_by_id=None,
            )

            setup_session.add(
                account,
            )

            await setup_session.flush()

            assert account.id is not None

            account_id = account.id

            resource = CloudResource(
                cloud_account_id=account.id,
                provider_resource_id=f"i-monitoring-lock-{suffix}",
                name="Monitoring Lock Instance",
                service="EC2",
                resource_type="AWS::EC2::Instance",
                region="eu-central-1",
                cloud_state="running",
                health_state="unknown",
                resource_metadata={},
                is_active=True,
            )

            setup_session.add(
                resource,
            )

            await setup_session.commit()

        assert account_id is not None
        assert organization_id is not None

        # ------------------------------------------------------
        # No real AWS call is allowed in this regression.
        # ------------------------------------------------------
        def fake_create_account_session(
            _self,
            _aws_account,
        ):
            return object()

        def fake_fetch_metrics(
            _self,
            *,
            session,
            region,
            queries,
            start_time,
            end_time,
            period_seconds=300,
        ):
            del session
            del region
            del start_time

            points: list[AwsMetricPoint] = []

            # Six low-CPU points force the real RecommendationEngine down
            # the branch that currently performs its own session.commit().
            for query in queries:
                if query.metric_name != "CPUUtilization":
                    continue

                for index in range(6):
                    points.append(
                        AwsMetricPoint(
                            resource_id=query.resource_id,
                            namespace=query.namespace,
                            metric_name=query.metric_name,
                            statistic=query.statistic,
                            value=5.0,
                            unit=query.unit,
                            timestamp=(
                                end_time
                                - timedelta(
                                    minutes=index * 5,
                                )
                            ),
                            period_seconds=period_seconds,
                        )
                    )

            return points

        monkeypatch.setattr(
            AwsSessionFactory,
            "create_account_session",
            fake_create_account_session,
        )

        monkeypatch.setattr(
            CloudWatchProvider,
            "fetch_metrics",
            fake_fetch_metrics,
        )

        # ------------------------------------------------------
        # Count commits made by the single MonitoringSyncService session.
        #
        # Correct transaction ownership:
        #   final FOR UPDATE barrier
        #     -> metric/health/incident/recommendation work
        #     -> ONE MonitoringSyncService-owned commit
        #
        # A nested downstream commit releases the cloud-account row lock
        # before the monitoring transaction has completed.
        # ------------------------------------------------------
        sync_session = Session()

        original_commit = AsyncSession.commit
        commit_calls = 0

        async def counted_commit(
            session: AsyncSession,
        ) -> None:
            nonlocal commit_calls

            if session is sync_session:
                commit_calls += 1

            await original_commit(
                session,
            )

        monkeypatch.setattr(
            AsyncSession,
            "commit",
            counted_commit,
        )

        try:
            samples_upserted = await MonitoringSyncService(
                sync_session,
            ).sync_account(
                account_id,
                11,
            )
        finally:
            await sync_session.close()

        # The mocked provider returned six normalized CPU metric points.
        assert samples_upserted == 6

        async with Session() as verification_session:
            recommendation_count = await verification_session.scalar(
                select(
                    func.count(
                        Recommendation.id,
                    )
                )
                .join(
                    CloudResource,
                    CloudResource.id == Recommendation.resource_id,
                )
                .where(
                    CloudResource.cloud_account_id == account_id,
                )
            )

            assert recommendation_count == 1

        # SECURITY / INTEGRITY INVARIANT:
        #
        # Once MonitoringSyncService obtains the final generation FOR UPDATE
        # lock, no nested service may commit independently. Otherwise the
        # disconnect generation barrier can be released before the sync ends.
        assert commit_calls == 1, (
            "Monitoring sync released its generation lock early: "
            f"observed {commit_calls} commits after the final generation "
            "barrier; expected exactly 1 MonitoringSyncService-owned commit."
        )

    finally:
        # ------------------------------------------------------
        # Idempotent cleanup for shared CI PostgreSQL.
        # Account deletion cascades resources, metrics and recommendations.
        # ------------------------------------------------------
        async with Session() as cleanup_session:
            if account_id is not None:
                await cleanup_session.execute(
                    delete(
                        CloudAccount,
                    ).where(
                        CloudAccount.id == account_id,
                    )
                )

            if organization_id is not None:
                await cleanup_session.execute(
                    delete(
                        Organization,
                    ).where(
                        Organization.id == organization_id,
                    )
                )

            await cleanup_session.commit()

        await engine.dispose()
