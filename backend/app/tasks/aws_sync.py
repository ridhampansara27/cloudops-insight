# Import asynchronous execution.
import asyncio

# Import UTC timestamp helpers.
from datetime import UTC, datetime

# Import UUID parsing.
from uuid import UUID

# Import SQLAlchemy async-engine utilities.
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

# Import application settings.
from app.core.config import settings

# Import CloudAccount ORM model.
from app.models.cloud_account import (
    CloudAccount,
)

# Import resource synchronization service.
from app.services.resource_sync_service import (
    ResourceSyncError,
    ResourceSyncService,
)

# Import Celery application.
from app.tasks.celery_app import (
    celery_app,
)

from sqlalchemy import select

# Import CloudWatch monitoring synchronization.
from app.services.monitoring_sync_service import (
    MonitoringSyncService,
)

# Import Cost Explorer synchronization.
from app.services.cost_sync_service import (
    CostSyncService,
)


# Execute one AWS synchronization inside an isolated async database engine.
async def _run_account_sync(
    account_id_text: str,
) -> dict[
    str,
    int | str,
]:
    # Convert Celery's JSON-safe account ID into UUID.
    account_id = UUID(
        account_id_text,
    )

    # Create an engine scoped to this worker task/event loop.
    engine = create_async_engine(
        # Use the normal application database.
        settings.database_url,
        # Check stale PostgreSQL connections before using them.
        pool_pre_ping=True,
    )

    # Create a task-local asynchronous session factory.
    session_factory = async_sessionmaker(
        # Bind sessions to the worker-specific engine.
        engine,
        # Keep loaded attributes accessible after commits.
        expire_on_commit=False,
    )

    try:
        # Open one database session for this task.
        async with session_factory() as session:
            # Retrieve the cloud account.
            account = await session.get(
                CloudAccount,
                account_id,
            )

            # Fail cleanly when account was deleted before execution.
            if account is None:
                raise RuntimeError(
                    "Cloud account does not exist.",
                )

            # Mark the background task as running.
            account.sync_status = "running"

            # Store task start time.
            account.sync_started_at = datetime.now(
                UTC,
            )

            # Clear previous failures.
            account.last_sync_error = None

            # Persist worker state immediately.
            await session.commit()

            try:
                # Run the real synchronization workflow.
                statistics = await ResourceSyncService(
                    session,
                ).sync_account(
                    account_id,
                )

            except Exception as error:
                # Clear partial transaction state.
                await session.rollback()

                # Reload account after rollback.
                account = await session.get(
                    CloudAccount,
                    account_id,
                )

                # Store failure state when the account still exists.
                if account is not None:
                    # Mark synchronization failure.
                    account.sync_status = "failed"

                    # Store safe provider message only when available.
                    account.last_sync_error = (
                        str(
                            error,
                        )
                        if isinstance(
                            error,
                            ResourceSyncError,
                        )
                        else ("Resource synchronization failed.")
                    )

                    # Persist failure state.
                    await session.commit()

                # Let Celery record task failure.
                raise

            # Reload account after ResourceSyncService's commit.
            account = await session.get(
                CloudAccount,
                account_id,
            )

            # Update final task state.
            if account is not None:
                # Mark successful completion.
                account.sync_status = "succeeded"

                # Clear old synchronization errors.
                account.last_sync_error = None

                # Persist completion state.
                await session.commit()

            # Return JSON-safe statistics.
            return statistics.to_dict()

    finally:
        # Explicitly dispose this task's asynchronous engine.
        await engine.dispose()


# Register the Celery task.
@celery_app.task(
    # Give the distributed task a stable name.
    name="cloudops.sync_aws_account",
)
def sync_aws_account_task(
    account_id: str,
) -> dict[
    str,
    int | str,
]:
    # Create an event loop for this worker execution.
    return asyncio.run(
        _run_account_sync(
            account_id,
        ),
    )




# Retrieve AWS accounts eligible for automatic synchronization.
async def _get_connected_aws_account_ids(
    *,
    skip_busy_resource_syncs: bool = False,
) -> list[str]:
    # Create an engine scoped to this Celery execution.
    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
    )

    # Create an asynchronous session factory.
    session_factory = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        # Open a database session.
        async with session_factory() as session:
            # Select connected AWS accounts only.
            statement = select(
                CloudAccount.id,
            ).where(
                CloudAccount.provider == "aws",
                CloudAccount.status == "connected",
            )

            # Resource discovery should not overlap an existing resource sync.
            if skip_busy_resource_syncs:
                statement = statement.where(
                    CloudAccount.sync_status.notin_(
                        [
                            "queued",
                            "running",
                        ],
                    ),
                )

            # Execute account query.
            result = await session.execute(
                statement,
            )

            # Convert UUIDs to JSON-safe strings for Celery.
            return [
                str(account_id)
                for account_id in result.scalars().all()
            ]

    finally:
        # Release worker-specific database connections.
        await engine.dispose()


# Run CloudWatch synchronization for one AWS account.
async def _run_metric_sync(
    account_id_text: str,
) -> dict[str, int | str]:
    # Convert Celery argument back into UUID.
    account_id = UUID(
        account_id_text,
    )

    # Create isolated asynchronous engine.
    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
    )

    # Create worker-local database sessions.
    session_factory = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        # Open database session.
        async with session_factory() as session:
            # Execute existing CloudWatch synchronization service.
            samples = await MonitoringSyncService(
                session,
            ).sync_account(
                account_id,
            )

            # Return JSON-safe Celery result.
            return {
                "account_id": account_id_text,
                "samples_upserted": samples,
            }

    finally:
        # Release worker database connections.
        await engine.dispose()


# Run Cost Explorer synchronization for one AWS account.
async def _run_cost_sync(
    account_id_text: str,
) -> dict[str, int | str]:
    # Convert Celery argument back into UUID.
    account_id = UUID(
        account_id_text,
    )

    # Create isolated asynchronous engine.
    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
    )

    # Create worker-local database sessions.
    session_factory = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        # Open database session.
        async with session_factory() as session:
            # Execute existing Cost Explorer synchronization.
            records = await CostSyncService(
                session,
            ).sync_account(
                account_id,
            )

            # Return JSON-safe Celery result.
            return {
                "account_id": account_id_text,
                "records_imported": records,
            }

    finally:
        # Release worker database connections.
        await engine.dispose()


# Register one-account CloudWatch synchronization task.
@celery_app.task(
    name="cloudops.sync_aws_metrics",
)
def sync_aws_metrics_task(
    account_id: str,
) -> dict[str, int | str]:
    # Execute asynchronous monitoring code from Celery.
    return asyncio.run(
        _run_metric_sync(
            account_id,
        ),
    )


# Register one-account Cost Explorer synchronization task.
@celery_app.task(
    name="cloudops.sync_aws_costs",
)
def sync_aws_costs_task(
    account_id: str,
) -> dict[str, int | str]:
    # Execute asynchronous cost synchronization from Celery.
    return asyncio.run(
        _run_cost_sync(
            account_id,
        ),
    )


# Register periodic resource discovery scheduler.
@celery_app.task(
    name="cloudops.schedule_all_aws_resource_syncs",
)
def schedule_all_aws_resource_syncs_task() -> dict[str, int]:
    # Retrieve connected AWS accounts that are not already synchronizing.
    account_ids = asyncio.run(
        _get_connected_aws_account_ids(
            skip_busy_resource_syncs=True,
        ),
    )

    # Queue one resource synchronization per account.
    for account_id in account_ids:
        sync_aws_account_task.delay(
            account_id,
        )

    # Report number of queued accounts.
    return {
        "scheduled": len(
            account_ids,
        ),
    }


# Register periodic CloudWatch scheduler.
@celery_app.task(
    name="cloudops.schedule_all_aws_metric_syncs",
)
def schedule_all_aws_metric_syncs_task() -> dict[str, int]:
    # Retrieve all connected AWS accounts.
    account_ids = asyncio.run(
        _get_connected_aws_account_ids(),
    )

    # Queue one monitoring synchronization per account.
    for account_id in account_ids:
        sync_aws_metrics_task.delay(
            account_id,
        )

    # Report number of queued accounts.
    return {
        "scheduled": len(
            account_ids,
        ),
    }


# Register periodic Cost Explorer scheduler.
@celery_app.task(
    name="cloudops.schedule_all_aws_cost_syncs",
)
def schedule_all_aws_cost_syncs_task() -> dict[str, int]:
    # Retrieve all connected AWS accounts.
    account_ids = asyncio.run(
        _get_connected_aws_account_ids(),
    )

    # Queue one cost synchronization per account.
    for account_id in account_ids:
        sync_aws_costs_task.delay(
            account_id,
        )

    # Report number of queued accounts.
    return {
        "scheduled": len(
            account_ids,
        ),
    }