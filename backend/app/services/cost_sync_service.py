"""Synchronize AWS billing data for one current connection generation."""

from datetime import UTC, datetime, timedelta
from functools import partial
from uuid import UUID

from anyio import to_thread
from botocore.exceptions import ClientError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cost import CostRecord
from app.models.resource import CloudResource
from app.providers.aws.cost_explorer import CostExplorerProvider
from app.providers.aws.session import AwsSessionFactory
from app.providers.aws.types import AwsAccountConfig
from app.services.cloud_account_connection_guard import (
    require_connection_revision,
)


class CostSyncService:
    """Synchronize Cost Explorer without stale-job persistence."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session
        self.session_factory = AwsSessionFactory()
        self.provider = CostExplorerProvider()

    async def sync_account(
        self,
        account_id: UUID,
        expected_connection_revision: int,
    ) -> int:
        """Fetch billing data then lock the generation before writing."""

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

        today = datetime.now(
            UTC,
        ).date()

        start_date = today.replace(
            day=1,
        )

        end_date = today + timedelta(
            days=1,
        )

        operation = partial(
            self.provider.get_daily_service_costs,
            session=aws_session,
            start_date=start_date,
            end_date=end_date,
        )

        records = await to_thread.run_sync(
            operation,
        )

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

            if (
                error_code == "AccessDeniedException"
                and "Resource-level data granularity is an opt-in" in error_message
            ):
                resource_records = []

            else:
                raise

        # No billing mutation is allowed until the generation is
        # revalidated under a database lock.
        await require_connection_revision(
            self.session,
            account_id=account_id,
            expected_revision=expected_connection_revision,
            required_status="connected",
            for_update=True,
        )

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

        for record in records:
            self.session.add(
                CostRecord(
                    cloud_account_id=account_id,
                    resource_id=None,
                    usage_date=record.usage_date,
                    service=record.service,
                    cost_type="service_aggregate",
                    amount=record.amount,
                    currency=record.currency,
                    is_estimated=record.estimated,
                ),
            )

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
                    service="Amazon Elastic Compute Cloud - Compute",
                    cost_type="resource_direct",
                    amount=record.amount,
                    currency=record.currency,
                    is_estimated=record.estimated,
                ),
            )

            resource_records_imported += 1

        await self.session.commit()

        return (
            len(
                records,
            )
            + resource_records_imported
        )
