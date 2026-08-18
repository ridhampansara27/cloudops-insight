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
