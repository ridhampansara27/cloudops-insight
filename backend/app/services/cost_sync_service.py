# Import timezone-aware date helpers.
from datetime import (
    UTC,
    datetime,
    timedelta,
)
from functools import partial

# Import UUID.
from uuid import UUID

# Import AnyIO thread support.
from anyio import to_thread

# Import SQLAlchemy deletion.
from sqlalchemy import delete

# Import asynchronous session.
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

# Import account and cost models.
from app.models.cloud_account import (
    CloudAccount,
)
from app.models.cost import (
    CostRecord,
)

# Import AWS Cost Explorer.
from app.providers.aws.cost_explorer import (
    CostExplorerProvider,
)

# Import AWS session factory.
from app.providers.aws.session import (
    AwsSessionFactory,
)

# Import AWS account configuration.
from app.providers.aws.types import (
    AwsAccountConfig,
)


# Synchronize real Cost Explorer data.
class CostSyncService:
    # Create service.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Store database session.
        self.session = session

        # Create AWS session helper.
        self.session_factory = AwsSessionFactory()

        # Create Cost Explorer provider.
        self.provider = CostExplorerProvider()

    # Synchronize one account's current-month service costs.
    async def sync_account(
        self,
        account_id: UUID,
    ) -> int:
        # Retrieve cloud account.
        account = await self.session.get(
            CloudAccount,
            account_id,
        )

        # Reject unknown accounts.
        if account is None:
            raise RuntimeError(
                "Cloud account not found.",
            )

        # Build AWS authentication configuration.
        aws_account = AwsAccountConfig(
            account_id=(account.external_account_id),
            role_arn=(account.role_arn),
            external_id=(account.external_id),
            enabled_regions=tuple(
                account.enabled_regions,
            ),
        )

        # Resolve AWS credentials.
        aws_session = await to_thread.run_sync(
            self.session_factory.create_account_session,
            aws_account,
        )

        # Calculate current billing month start.
        # Determine today's date using UTC.
        today = datetime.now(
            UTC,
        ).date()

        # Use first day of current month.
        start_date = today.replace(
            day=1,
        )

        # Cost Explorer end date is exclusive.
        end_date = today + timedelta(
            days=1,
        )

        # Bind blocking provider call.
        operation = partial(
            self.provider.get_daily_service_costs,
            session=aws_session,
            start_date=start_date,
            end_date=end_date,
        )

        # Retrieve Cost Explorer data outside event loop.
        records = await to_thread.run_sync(
            operation,
        )

        # Remove earlier service aggregates for the same month.
        await self.session.execute(
            delete(
                CostRecord,
            ).where(
                CostRecord.cloud_account_id == account_id,
                CostRecord.cost_type == "service_aggregate",
                CostRecord.usage_date >= start_date,
                CostRecord.usage_date < end_date,
            ),
        )

        # Insert normalized real AWS costs.
        for record in records:
            self.session.add(
                CostRecord(
                    cloud_account_id=(account_id),
                    resource_id=None,
                    usage_date=(record.usage_date),
                    service=(record.service),
                    cost_type=("service_aggregate"),
                    amount=(record.amount),
                    currency=(record.currency),
                    is_estimated=(record.estimated),
                ),
            )

        # Persist complete replacement atomically.
        await self.session.commit()

        # Return imported record count.
        return len(
            records,
        )
