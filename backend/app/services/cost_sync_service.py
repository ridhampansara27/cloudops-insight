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

# Import AWS API error handling.
from botocore.exceptions import ClientError

# Import SQLAlchemy querying and deletion.
from sqlalchemy import delete, select

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

# Import discovered resource model for provider-ID mapping.
from app.models.resource import (
    CloudResource,
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

        # AWS resource-level billing is an optional Cost Explorer
        # feature. Query it when enabled, while preserving normal
        # service-level cost synchronization when it is disabled.
        resource_start_date = max(
            start_date,
            today
            - timedelta(
                days=13,
            ),
        )

        resource_operation = partial(
            self.provider.get_daily_ec2_resource_costs,
            session=aws_session,
            start_date=resource_start_date,
            end_date=end_date,
        )

        try:
            resource_records = await to_thread.run_sync(
                resource_operation,
            )

        except ClientError as error:
            error_details = error.response.get(
                "Error",
                {},
            )

            error_code = error_details.get(
                "Code",
                "",
            )

            error_message = error_details.get(
                "Message",
                "",
            )

            # Resource-level Cost Explorer granularity is opt-in.
            # Do not fail the complete cost synchronization when
            # this optional feature has not been enabled.
            if (
                error_code == "AccessDeniedException"
                and "Resource-level data granularity is an opt-in" in error_message
            ):
                resource_records = []

            else:
                raise

        # Map AWS provider IDs such as EC2 instance IDs onto
        # CloudOps resource UUIDs.
        resource_result = await self.session.execute(
            select(
                CloudResource,
            ).where(
                CloudResource.cloud_account_id == account_id,
                CloudResource.service == "EC2",
            ),
        )

        resources_by_provider_id = {
            resource.provider_resource_id: resource
            for resource in resource_result.scalars().all()
        }

        # Replace any previously imported EC2 resource-level
        # costs in the supported resource-level billing window.
        await self.session.execute(
            delete(
                CostRecord,
            ).where(
                CostRecord.cloud_account_id == account_id,
                CostRecord.cost_type == "resource_direct",
                CostRecord.usage_date >= resource_start_date,
                CostRecord.usage_date < end_date,
            ),
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

        # Persist resource-level EC2 costs only when AWS supplied
        # data and the provider resource maps to discovered inventory.
        resource_records_imported = 0

        for record in resource_records:
            resource = resources_by_provider_id.get(
                record.resource_id,
            )

            if resource is None:
                continue

            self.session.add(
                CostRecord(
                    cloud_account_id=account_id,
                    resource_id=resource.id,
                    usage_date=record.usage_date,
                    service=("Amazon Elastic Compute Cloud - Compute"),
                    cost_type="resource_direct",
                    amount=record.amount,
                    currency=record.currency,
                    is_estimated=record.estimated,
                ),
            )

            resource_records_imported += 1

        # Persist complete replacement atomically.
        await self.session.commit()

        # Return imported record count.
        return (
            len(
                records,
            )
            + resource_records_imported
        )
