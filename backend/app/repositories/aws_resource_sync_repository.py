# Import dataclass support for returning synchronization results.
from dataclasses import dataclass

# Import timezone-aware datetime typing.
from datetime import datetime

# Import Literal for strongly typed synchronization outcomes.
from typing import Literal

# Import UUID typing.
from uuid import UUID

# Import SQLAlchemy querying.
from sqlalchemy import select

# Import asynchronous SQLAlchemy session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import resource ORM models.
from app.models.resource import (
    CloudResource,
    ResourceTag,
)

# Import normalized AWS discovery data.
from app.providers.aws.types import (
    AwsDiscoveredResource,
)

# Define the possible results of synchronizing one resource.
ResourceSyncOutcome = Literal[
    "created",
    "updated",
    "reactivated",
]


# Describe the synchronization result for one resource.
@dataclass(
    slots=True,
)
class ResourceUpsertResult:
    # Report whether the resource was created, updated, or reactivated.
    outcome: ResourceSyncOutcome

    # Count newly created tags.
    tags_created: int

    # Count changed tag values.
    tags_updated: int

    # Count tags that disappeared from AWS.
    tags_deleted: int


# Encapsulate database persistence for AWS resource discovery.
class AwsResourceSyncRepository:
    # Store the request/task-scoped database session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Save the SQLAlchemy session.
        self.session = session

    # Load every known resource belonging to one cloud account.
    async def get_account_resources(
        self,
        account_id: UUID,
    ) -> dict[str, CloudResource]:
        # Query both active and inactive resources.
        statement = select(
            CloudResource,
        ).where(
            CloudResource.cloud_account_id == account_id,
        )

        # Execute the query asynchronously.
        result = await self.session.execute(
            statement,
        )

        # Build a provider-ID lookup table.
        return {
            resource.provider_resource_id: resource
            for resource in result.scalars().all()
        }

    # Create or update one AWS-discovered resource.
    async def upsert_resource(
        self,
        *,
        account_id: UUID,
        discovered: AwsDiscoveredResource,
        existing_resources: dict[
            str,
            CloudResource,
        ],
        now: datetime,
    ) -> ResourceUpsertResult:
        # Try to locate the resource from an earlier synchronization.
        resource = existing_resources.get(
            discovered.provider_resource_id,
        )

        # Track whether this resource is new or existing.
        if resource is None:
            # Create a new inventory record.
            resource = CloudResource(
                # Associate the resource with its cloud account.
                cloud_account_id=account_id,
                # Store AWS' provider-native identifier.
                provider_resource_id=(discovered.provider_resource_id),
                # Store ARN when AWS provides one.
                arn=discovered.arn,
                # Store human-readable resource name.
                name=discovered.name,
                # Store normalized AWS service.
                service=discovered.service,
                # Store provider resource type.
                resource_type=(discovered.resource_type),
                # Store AWS region.
                region=discovered.region,
                # Store availability zone when applicable.
                availability_zone=(discovered.availability_zone),
                # Store normalized environment.
                environment=(discovered.environment),
                # Store normalized owner/team.
                owner=discovered.owner,
                # Store AWS-native state.
                cloud_state=(discovered.cloud_state),
                # Real monitoring has not evaluated health yet.
                health_state="unknown",
                # Store provider-specific metadata.
                resource_metadata=(discovered.metadata),
                # Record first discovery.
                first_seen_at=now,
                # Record latest discovery.
                last_seen_at=now,
                # Record synchronization time.
                last_synced_at=now,
                # New resources are active.
                is_active=True,
                # Active resources are not deleted.
                deleted_at=None,
            )

            # Stage the new resource.
            self.session.add(
                resource,
            )

            # Flush so the new UUID exists before synchronizing tags.
            await self.session.flush()

            # Store it in the in-memory lookup.
            existing_resources[discovered.provider_resource_id] = resource

            # Report resource creation.
            outcome: ResourceSyncOutcome = "created"

        else:
            # Remember whether AWS is reintroducing an inactive resource.
            was_inactive = not resource.is_active

            # Update provider ARN.
            resource.arn = discovered.arn

            # Update display name.
            resource.name = discovered.name

            # Update service.
            resource.service = discovered.service

            # Update provider resource type.
            resource.resource_type = discovered.resource_type

            # Update region.
            resource.region = discovered.region

            # Update availability zone.
            resource.availability_zone = discovered.availability_zone

            # Update normalized environment.
            resource.environment = discovered.environment

            # Update ownership.
            resource.owner = discovered.owner

            # Update AWS-native lifecycle state.
            resource.cloud_state = discovered.cloud_state

            # Replace provider metadata with the latest discovery payload.
            resource.resource_metadata = discovered.metadata

            # Record that AWS returned the resource during this sync.
            resource.last_seen_at = now

            # Record the synchronization timestamp.
            resource.last_synced_at = now

            # Reactivate the resource.
            resource.is_active = True

            # Clear the old disappearance timestamp.
            resource.deleted_at = None

            # Distinguish normal updates from reactivation.
            outcome = "reactivated" if was_inactive else "updated"

        # Synchronize the resource's exact AWS tag set.
        (
            tags_created,
            tags_updated,
            tags_deleted,
        ) = await self._sync_tags(
            resource_id=resource.id,
            discovered_tags=(discovered.tags),
        )

        # Return synchronization statistics.
        return ResourceUpsertResult(
            outcome=outcome,
            tags_created=tags_created,
            tags_updated=tags_updated,
            tags_deleted=tags_deleted,
        )

    # Synchronize provider tags exactly with AWS.
    async def _sync_tags(
        self,
        *,
        resource_id: UUID,
        discovered_tags: dict[
            str,
            str,
        ],
    ) -> tuple[
        int,
        int,
        int,
    ]:
        # Load currently stored tags.
        result = await self.session.execute(
            select(
                ResourceTag,
            ).where(
                ResourceTag.resource_id == resource_id,
            ),
        )

        # Create a key-based tag lookup.
        existing_tags = {tag.key: tag for tag in result.scalars().all()}

        # Initialize statistics.
        created = 0
        updated = 0
        deleted = 0

        # Process every tag currently returned by AWS.
        for (
            key,
            value,
        ) in discovered_tags.items():
            # Look for the tag in PostgreSQL.
            existing_tag = existing_tags.get(
                key,
            )

            # Create tags that do not exist yet.
            if existing_tag is None:
                # Stage the new provider tag.
                self.session.add(
                    ResourceTag(
                        resource_id=(resource_id),
                        key=key,
                        value=value,
                    ),
                )

                # Increment creation statistics.
                created += 1

                # Continue with the next tag.
                continue

            # Update tags whose values changed in AWS.
            if existing_tag.value != value:
                # Store the latest tag value.
                existing_tag.value = value

                # Increment update statistics.
                updated += 1

        # Remove tags that AWS no longer returns.
        for (
            key,
            existing_tag,
        ) in existing_tags.items():
            # Keep tags still present in AWS.
            if key in discovered_tags:
                continue

            # Delete stale provider tag.
            await self.session.delete(
                existing_tag,
            )

            # Increment deletion statistics.
            deleted += 1

        # Return detailed tag statistics.
        return (
            created,
            updated,
            deleted,
        )

    # Mark resources missing from a complete successful AWS discovery as inactive.
    def deactivate_missing_resources(
        self,
        *,
        existing_resources: dict[
            str,
            CloudResource,
        ],
        seen_provider_ids: set[str],
        now: datetime,
    ) -> int:
        # Initialize deactivation counter.
        deactivated = 0

        # Inspect every known resource for this cloud account.
        for resource in existing_resources.values():
            # Keep resources that AWS returned during this synchronization.
            if resource.provider_resource_id in seen_provider_ids:
                continue

            # Keep resources that were already inactive.
            if not resource.is_active:
                continue

            # Mark the missing resource inactive.
            resource.is_active = False

            # Record when it first disappeared.
            resource.deleted_at = now

            # Record that lifecycle evaluation happened during this sync.
            resource.last_synced_at = now

            # Increment statistics.
            deactivated += 1

        # Return total newly inactive resources.
        return deactivated
