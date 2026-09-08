# Import partial for worker-thread keyword arguments.
# Import datetime helpers.
from datetime import (
    UTC,
    datetime,
    timedelta,
)
from functools import partial

# Import UUID typing.
from uuid import UUID

# Import AnyIO thread execution.
from anyio import to_thread

# Import SQLAlchemy querying.
from sqlalchemy import select

# Import asynchronous database session.
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

# Import cloud account and resource models.
from app.models.cloud_account import (
    CloudAccount,
)
from app.models.resource import (
    CloudResource,
)

# Import AWS CloudWatch provider.
from app.providers.aws.cloudwatch import (
    CloudWatchProvider,
)

# Import AWS account session factory.
from app.providers.aws.session import (
    AwsSessionFactory,
)

# Import AWS account configuration.
from app.providers.aws.types import (
    AwsAccountConfig,
)

# Import metric persistence.
from app.repositories.metric_repository import (
    MetricRepository,
)

# Import resource health evaluator.
from app.services.health_evaluation_service import (
    HealthEvaluationService,
)

# Import monitoring incident reconciliation.
from app.services.monitoring_incident_service import (
    MonitoringIncidentService,
)

# Import monitoring query construction.
from app.services.monitoring_query_factory import (
    build_metric_queries,
)

# Import FinOps recommendation evaluation.
from app.services.recommendation_engine import (
    RecommendationEngine,
)


# Coordinate CloudWatch metric synchronization.
class MonitoringSyncService:
    # Create service.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Store database session.
        self.session = session

        # Create AWS session factory.
        self.session_factory = AwsSessionFactory()

        # Create CloudWatch provider.
        self.cloudwatch = CloudWatchProvider()

        # Create metric repository.
        self.repository = MetricRepository(
            session,
        )

    # Synchronize monitoring data for one account.
    async def sync_account(
        self,
        account_id: UUID,
    ) -> int:
        # Retrieve cloud account.
        account = await self.session.get(
            CloudAccount,
            account_id,
        )

        # Reject missing accounts.
        if account is None:
            raise RuntimeError(
                "Cloud account not found.",
            )

        # Require validated AWS connection.
        if account.status != "connected":
            raise RuntimeError(
                "AWS account is not connected.",
            )

        # Build provider account configuration.
        aws_account = AwsAccountConfig(
            account_id=(account.external_account_id),
            role_arn=(account.role_arn),
            external_id=(account.external_id),
            enabled_regions=tuple(
                account.enabled_regions,
            ),
        )

        # Create assumed-role AWS session.
        aws_session = await to_thread.run_sync(
            self.session_factory.create_account_session,
            aws_account,
        )

        # Retrieve active inventory.
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

        # Store resources.
        resources = list(
            result.scalars().all(),
        )

        # Define one-hour overlapping synchronization window.
        end_time = datetime.now(
            UTC,
        )

        # Start one hour earlier.
        start_time = end_time - timedelta(
            hours=1,
        )

        # Track persisted point count.
        total_points = 0

        # Process one AWS region at a time.
        for region in account.enabled_regions:
            # Select resources belonging to the region.
            regional_resources = [
                resource for resource in resources if resource.region == region
            ]

            # Build metric queries.
            queries = [
                query
                for resource in regional_resources
                for query in build_metric_queries(
                    resource,
                )
            ]

            # Skip regions without supported metrics.
            if not queries:
                continue

            # Create a blocking CloudWatch call with arguments already bound.
            fetch_operation = partial(
                self.cloudwatch.fetch_metrics,
                session=aws_session,
                region=region,
                queries=queries,
                start_time=start_time,
                end_time=end_time,
                period_seconds=300,
            )

            # Run synchronous Boto3 outside the async event loop.
            points = await to_thread.run_sync(
                fetch_operation,
            )

            # Persist normalized metric data.
            total_points += await self.repository.upsert_points(
                points,
            )

        # Create health evaluator.
        health_service = HealthEvaluationService(
            self.session,
        )

        # Create automatic incident evaluator.
        incident_service = MonitoringIncidentService(
            self.session,
        )

        # Create the FinOps recommendation evaluator.
        recommendation_engine = RecommendationEngine(
            self.session,
        )

        # Evaluate every active resource.
        for resource in resources:
            # Evaluate real monitoring state.
            evaluation = await health_service.evaluate(
                resource,
            )

            # Persist health.
            resource.health_state = evaluation.state

            # Reconcile automatic incident state.
            await incident_service.reconcile(
                resource=resource,
                evaluation=evaluation,
            )

            # Refresh optimization recommendations using the
            # latest real CloudWatch observations.
            await recommendation_engine.evaluate_resource(
                resource,
            )

        # Commit all metric updates.
        await self.session.commit()

        # Return synchronization count.
        return total_points
