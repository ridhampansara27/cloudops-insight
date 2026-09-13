"""Synchronize CloudWatch data for a current cloud connection generation."""

from datetime import UTC, datetime, timedelta
from functools import partial
from uuid import UUID

from anyio import to_thread
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resource import CloudResource
from app.providers.aws.cloudwatch import CloudWatchProvider
from app.providers.aws.session import AwsSessionFactory
from app.providers.aws.types import AwsAccountConfig
from app.repositories.metric_repository import MetricRepository
from app.services.cloud_account_connection_guard import (
    require_connection_revision,
)
from app.services.health_evaluation_service import HealthEvaluationService
from app.services.monitoring_incident_service import MonitoringIncidentService
from app.services.monitoring_query_factory import build_metric_queries
from app.services.recommendation_engine import RecommendationEngine


class MonitoringSyncService:
    """Synchronize metrics without allowing disconnected jobs to persist."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session
        self.session_factory = AwsSessionFactory()
        self.cloudwatch = CloudWatchProvider()
        self.repository = MetricRepository(
            session,
        )

    async def sync_account(
        self,
        account_id: UUID,
        expected_connection_revision: int,
    ) -> int:
        """Fetch first, then generation-lock before persistence."""

        account = await require_connection_revision(
            self.session,
            account_id=account_id,
            expected_revision=expected_connection_revision,
            required_status="connected",
        )

        aws_account = AwsAccountConfig(
            account_id=account.external_account_id,
            role_arn=account.role_arn,
            external_id=account.external_id,
            enabled_regions=tuple(
                account.enabled_regions,
            ),
        )

        aws_session = await to_thread.run_sync(
            self.session_factory.create_account_session,
            aws_account,
        )

        result = await self.session.execute(
            select(
                CloudResource,
            ).where(
                CloudResource.cloud_account_id == account_id,
                CloudResource.is_active.is_(
                    True,
                ),
            ),
        )

        resources = list(
            result.scalars().all(),
        )

        end_time = datetime.now(
            UTC,
        )

        start_time = end_time - timedelta(
            hours=1,
        )

        # Keep provider results in memory until the final generation check.
        all_points = []

        for region in account.enabled_regions:
            regional_resources = [
                resource for resource in resources if resource.region == region
            ]

            queries = [
                query
                for resource in regional_resources
                for query in build_metric_queries(
                    resource,
                )
            ]

            if not queries:
                continue

            fetch_operation = partial(
                self.cloudwatch.fetch_metrics,
                session=aws_session,
                region=region,
                queries=queries,
                start_time=start_time,
                end_time=end_time,
                period_seconds=300,
            )

            points = await to_thread.run_sync(
                fetch_operation,
            )

            all_points.extend(
                points,
            )

        # Lock immediately before writing provider-derived state.
        await require_connection_revision(
            self.session,
            account_id=account_id,
            expected_revision=expected_connection_revision,
            required_status="connected",
            for_update=True,
        )

        total_points = await self.repository.upsert_points(
            all_points,
        )

        health_service = HealthEvaluationService(
            self.session,
        )

        incident_service = MonitoringIncidentService(
            self.session,
        )

        recommendation_engine = RecommendationEngine(
            self.session,
        )

        for resource in resources:
            evaluation = await health_service.evaluate(
                resource,
            )

            resource.health_state = evaluation.state

            await incident_service.reconcile(
                resource=resource,
                evaluation=evaluation,
            )

            await recommendation_engine.evaluate_resource(
                resource,
            )

        await self.session.commit()

        return total_points
