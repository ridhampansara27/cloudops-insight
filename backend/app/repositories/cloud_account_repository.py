# Import UUID typing.
from uuid import UUID

# Import SQLAlchemy query helpers.
from sqlalchemy import select

# Import the asynchronous database session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import the CloudAccount ORM model.
from app.models.cloud_account import CloudAccount

# Import request schemas.
from app.schemas.cloud_account import (
    CloudAccountCreate,
    CloudAccountUpdate,
)


# Encapsulate database operations for cloud accounts.
class CloudAccountRepository:
    # Store the request-scoped database session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Save the SQLAlchemy session.
        self.session = session

    # Return all cloud accounts.
    async def list_all(
        self,
    ) -> list[CloudAccount]:
        # Sort accounts by creation time.
        statement = select(
            CloudAccount,
        ).order_by(
            CloudAccount.created_at.desc(),
        )

        # Execute the asynchronous query.
        result = await self.session.execute(
            statement,
        )

        # Return ORM objects.
        return list(
            result.scalars().all(),
        )

    # Find one cloud account by UUID.
    async def get_by_id(
        self,
        account_id: UUID,
    ) -> CloudAccount | None:
        # Use the primary-key lookup.
        return await self.session.get(
            CloudAccount,
            account_id,
        )

    # Check whether one provider account already exists.
    async def get_by_external_id(
        self,
        *,
        provider: str,
        external_account_id: str,
    ) -> CloudAccount | None:
        # Build the account lookup query.
        statement = select(
            CloudAccount,
        ).where(
            CloudAccount.provider == provider,
            CloudAccount.external_account_id == external_account_id,
        )

        # Execute the query.
        result = await self.session.execute(
            statement,
        )

        # Return zero or one account.
        return result.scalar_one_or_none()

    # Create one cloud-account record.
    async def create(
        self,
        *,
        payload: CloudAccountCreate,
        created_by_id: UUID,
    ) -> CloudAccount:
        # Build the ORM model.
        account = CloudAccount(
            # Store provider information.
            provider=payload.provider.lower(),
            # Store the display name.
            name=payload.name,
            # Store the AWS/provider account ID.
            external_account_id=payload.external_account_id,
            # Store the IAM role.
            role_arn=payload.role_arn,
            # Store the optional external identifier.
            external_id=payload.external_id,
            # Store enabled regions.
            enabled_regions=payload.enabled_regions,
            # Start the connection in pending state.
            status="pending",
            # Record the creator.
            created_by_id=created_by_id,
        )

        # Stage the insert.
        self.session.add(account)

        # Persist the record.
        await self.session.commit()

        # Reload database-generated values.
        await self.session.refresh(
            account,
        )

        # Return the persisted account.
        return account

    # Update an existing account.
    async def update(
        self,
        *,
        account: CloudAccount,
        payload: CloudAccountUpdate,
    ) -> CloudAccount:
        # Extract only fields actually supplied by the caller.
        changes = payload.model_dump(
            exclude_unset=True,
        )

        # Apply every requested change.
        for field_name, value in changes.items():
            # Update the ORM object.
            setattr(
                account,
                field_name,
                value,
            )

        # Persist modifications.
        await self.session.commit()

        # Reload database-generated values.
        await self.session.refresh(
            account,
        )

        # Return the updated account.
        return account

    # Delete one account.
    async def delete(
        self,
        account: CloudAccount,
    ) -> None:
        # Mark the ORM object for deletion.
        await self.session.delete(
            account,
        )

        # Commit the transaction.
        await self.session.commit()
