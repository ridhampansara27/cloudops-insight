"""Coordinate AWS inventory discovery and persistence."""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from anyio import to_thread
from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy.ext.asyncio import AsyncSession

from app.providers.aws.discovery import AwsDiscoveryService
from app.providers.aws.types import AwsAccountConfig
from app.repositories.aws_resource_sync_repository import AwsResourceSyncRepository
from app.services.cloud_account_connection_guard import (
    require_connection_revision,
)


class ResourceSyncError(RuntimeError):
    """Represent a safe AWS inventory synchronization failure."""


@dataclass(
    slots=True,
)
class ResourceSyncStatistics:
    account_id: UUID
    discovered: int
    created: int
    updated: int
    reactivated: int
    deactivated: int
    tags_created: int
    tags_updated: int
    tags_deleted: int

    def to_dict(
        self,
    ) -> dict[str, int | str]:
        return {
            "account_id": str(
                self.account_id,
            ),
            "discovered": self.discovered,
            "created": self.created,
            "updated": self.updated,
            "reactivated": self.reactivated,
            "deactivated": self.deactivated,
            "tags_created": self.tags_created,
            "tags_updated": self.tags_updated,
            "tags_deleted": self.tags_deleted,
        }


class ResourceSyncService:
    """Synchronize resources only for the queued connection generation."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

        self.discovery_service = AwsDiscoveryService()

        self.repository = AwsResourceSyncRepository(
            session,
        )

    async def sync_account(
        self,
        account_id: UUID,
        expected_connection_revision: int,
    ) -> ResourceSyncStatistics:
        """Run AWS discovery with pre-call and pre-commit barriers."""

        # Barrier 1:
        # stale/disconnected work must never make an AWS call.
        account = await require_connection_revision(
            self.session,
            account_id=account_id,
            expected_revision=expected_connection_revision,
            required_status="connected",
        )

        if account.provider.lower() != "aws":
            raise ResourceSyncError(
                "Resource synchronization currently supports AWS only.",
            )

        aws_account = AwsAccountConfig(
            account_id=account.external_account_id,
            role_arn=account.role_arn,
            external_id=account.external_id,
            enabled_regions=tuple(
                account.enabled_regions,
            ),
        )

        try:
            discovered_resources = await to_thread.run_sync(
                self.discovery_service.discover_account,
                aws_account,
            )

        except (
            ClientError,
            BotoCoreError,
        ) as error:
            await self.session.rollback()

            raise ResourceSyncError(
                "AWS resource discovery failed.",
            ) from error

        # Barrier 2:
        # lock the connection generation before any provider data is
        # processed or committed. Disconnect waits for this transaction.
        account = await require_connection_revision(
            self.session,
            account_id=account_id,
            expected_revision=expected_connection_revision,
            required_status="connected",
            for_update=True,
        )

        discovered_by_id = {
            resource.provider_resource_id: resource for resource in discovered_resources
        }

        now = datetime.now(
            UTC,
        )

        try:
            existing_resources = await self.repository.get_account_resources(
                account_id,
            )

            created = 0
            updated = 0
            reactivated = 0

            tags_created = 0
            tags_updated = 0
            tags_deleted = 0

            for discovered in discovered_by_id.values():
                result = await self.repository.upsert_resource(
                    account_id=account_id,
                    discovered=discovered,
                    existing_resources=existing_resources,
                    now=now,
                )

                if result.outcome == "created":
                    created += 1

                elif result.outcome == "reactivated":
                    reactivated += 1

                else:
                    updated += 1

                tags_created += result.tags_created
                tags_updated += result.tags_updated
                tags_deleted += result.tags_deleted

            seen_provider_ids = set(
                discovered_by_id,
            )

            deactivated = self.repository.deactivate_missing_resources(
                existing_resources=existing_resources,
                seen_provider_ids=seen_provider_ids,
                now=now,
            )

            account.last_synced_at = now

            await self.session.commit()

        except Exception:
            await self.session.rollback()
            raise

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
