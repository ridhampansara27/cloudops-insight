# Import dataclass support.
from dataclasses import dataclass

# Import timezone-aware datetime helpers.
from datetime import UTC, datetime

# Import UUID typing.
from uuid import UUID

# Import AnyIO's worker-thread helper.
from anyio import to_thread

# Import AWS SDK exceptions.
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
)

# Import asynchronous SQLAlchemy session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import cloud-account model.
from app.models.cloud_account import (
    CloudAccount,
)

# Import AWS discovery service.
from app.providers.aws.discovery import (
    AwsDiscoveryService,
)

# Import AWS account configuration.
from app.providers.aws.types import (
    AwsAccountConfig,
)

# Import resource synchronization repository.
from app.repositories.aws_resource_sync_repository import (
    AwsResourceSyncRepository,
)


# Define a safe synchronization failure.
class ResourceSyncError(
    RuntimeError,
):
    # Represent AWS discovery/synchronization failure.
    pass


# Describe one complete account synchronization.
@dataclass(
    slots=True,
)
class ResourceSyncStatistics:
    # Store the CloudOps account UUID.
    account_id: UUID

    # Count unique AWS resources returned.
    discovered: int

    # Count newly created resources.
    created: int

    # Count existing resources refreshed.
    updated: int

    # Count previously inactive resources returned by AWS.
    reactivated: int

    # Count resources no longer returned by AWS.
    deactivated: int

    # Count newly created provider tags.
    tags_created: int

    # Count changed provider tags.
    tags_updated: int

    # Count removed provider tags.
    tags_deleted: int

    # Convert statistics into Celery/JSON-safe values.
    def to_dict(
        self,
    ) -> dict[
        str,
        int | str,
    ]:
        # Return primitive values only.
        return {
            "account_id": str(
                self.account_id,
            ),
            "discovered": (self.discovered),
            "created": (self.created),
            "updated": (self.updated),
            "reactivated": (self.reactivated),
            "deactivated": (self.deactivated),
            "tags_created": (self.tags_created),
            "tags_updated": (self.tags_updated),
            "tags_deleted": (self.tags_deleted),
        }


# Coordinate AWS discovery and PostgreSQL persistence.
class ResourceSyncService:
    # Create the synchronization service.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Store the database session.
        self.session = session

        # Create AWS discovery provider.
        self.discovery_service = AwsDiscoveryService()

        # Create persistence repository.
        self.repository = AwsResourceSyncRepository(
            session,
        )

    # Synchronize one connected AWS account.
    async def sync_account(
        self,
        account_id: UUID,
    ) -> ResourceSyncStatistics:
        # Retrieve account configuration.
        account = await self.session.get(
            CloudAccount,
            account_id,
        )

        # Reject unknown account IDs.
        if account is None:
            raise ResourceSyncError(
                "Cloud account not found.",
            )

        # Reject unsupported providers.
        if account.provider.lower() != "aws":
            raise ResourceSyncError(
                "Resource synchronization currently supports AWS only.",
            )

        # Require successful AWS connection validation first.
        if account.status != "connected":
            raise ResourceSyncError(
                "Validate the AWS account before synchronizing resources.",
            )

        # Create an immutable provider configuration snapshot.
        aws_account = AwsAccountConfig(
            # Store expected AWS account ID.
            account_id=(account.external_account_id),
            # Store optional AssumeRole ARN.
            role_arn=(account.role_arn),
            # Store optional STS ExternalId.
            external_id=(account.external_id),
            # Store enabled AWS regions.
            enabled_regions=tuple(
                account.enabled_regions,
            ),
        )

        try:
            # Run synchronous Boto3 discovery outside FastAPI's event loop.
            discovered_resources = await to_thread.run_sync(
                self.discovery_service.discover_account,
                aws_account,
            )

        except (
            ClientError,
            BotoCoreError,
        ) as error:
            # Ensure no partial database transaction survives.
            await self.session.rollback()

            # Return a safe provider failure.
            raise ResourceSyncError(
                "AWS resource discovery failed.",
            ) from error

        # Deduplicate resources by provider-native ID.
        discovered_by_id = {
            resource.provider_resource_id: resource for resource in discovered_resources
        }

        # Capture one timestamp for the complete synchronization.
        now = datetime.now(
            UTC,
        )

        try:
            # Load current PostgreSQL inventory.
            existing_resources = await self.repository.get_account_resources(
                account_id,
            )

            # Initialize counters.
            created = 0
            updated = 0
            reactivated = 0

            tags_created = 0
            tags_updated = 0
            tags_deleted = 0

            # Synchronize every AWS resource.
            for discovered in discovered_by_id.values():
                # Upsert one inventory record.
                result = await self.repository.upsert_resource(
                    account_id=(account_id),
                    discovered=(discovered),
                    existing_resources=(existing_resources),
                    now=now,
                )

                # Count resource result type.
                if result.outcome == "created":
                    created += 1

                elif result.outcome == "reactivated":
                    reactivated += 1

                else:
                    updated += 1

                # Accumulate provider-tag statistics.
                tags_created += result.tags_created

                tags_updated += result.tags_updated

                tags_deleted += result.tags_deleted

            # Collect IDs AWS returned during this successful run.
            seen_provider_ids = set(
                discovered_by_id,
            )

            # Mark resources that disappeared from AWS inactive.
            deactivated = self.repository.deactivate_missing_resources(
                existing_resources=(existing_resources),
                seen_provider_ids=(seen_provider_ids),
                now=now,
            )

            # Record successful account synchronization time.
            account.last_synced_at = now

            # Persist the complete synchronization atomically.
            await self.session.commit()

        except Exception:
            # Roll back partial inventory changes.
            await self.session.rollback()

            # Preserve the original programming/database exception.
            raise

        # Return synchronization statistics.
        return ResourceSyncStatistics(
            account_id=account_id,
            discovered=len(
                discovered_by_id,
            ),
            created=created,
            updated=updated,
            reactivated=reactivated,
            deactivated=deactivated,
            tags_created=tags_created,
            tags_updated=tags_updated,
            tags_deleted=tags_deleted,
        )
