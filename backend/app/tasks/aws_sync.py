"""Celery AWS synchronization with connection-generation barriers."""

import asyncio
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.cloud_account import CloudAccount
from app.services.cloud_account_connection_guard import (
    StaleCloudAccountConnectionError,
    require_connection_revision,
)
from app.services.cost_sync_service import CostSyncService
from app.services.monitoring_sync_service import MonitoringSyncService
from app.services.resource_sync_service import (
    ResourceSyncError,
    ResourceSyncService,
)
from app.tasks.celery_app import celery_app


def _stale_result(
    account_id: str,
) -> dict[str, int | str]:
    """Return a successful no-op result for intentionally stale work."""

    return {
        "account_id": account_id,
        "status": "skipped_stale",
    }


async def _run_account_sync(
    account_id_text: str,
    connection_revision: int,
) -> dict[str, int | str]:
    """Run resource sync only for the queued connection generation."""

    account_id = UUID(
        account_id_text,
    )

    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
    )

    session_factory = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        async with session_factory() as session:
            try:
                # Lock while changing queued -> running so disconnect
                # cannot race this state transition.
                account = await require_connection_revision(
                    session,
                    account_id=account_id,
                    expected_revision=connection_revision,
                    required_status="connected",
                    for_update=True,
                )

            except StaleCloudAccountConnectionError:
                await session.rollback()

                return _stale_result(
                    account_id_text,
                )

            account.sync_status = "running"
            account.sync_started_at = datetime.now(
                UTC,
            )
            account.last_sync_error = None

            await session.commit()

            try:
                statistics = await ResourceSyncService(
                    session,
                ).sync_account(
                    account_id,
                    connection_revision,
                )

            except StaleCloudAccountConnectionError:
                await session.rollback()

                return _stale_result(
                    account_id_text,
                )

            except Exception as error:
                await session.rollback()

                try:
                    account = await require_connection_revision(
                        session,
                        account_id=account_id,
                        expected_revision=connection_revision,
                        required_status="connected",
                        for_update=True,
                    )

                except StaleCloudAccountConnectionError:
                    await session.rollback()

                    return _stale_result(
                        account_id_text,
                    )

                account.sync_status = "failed"

                account.last_sync_error = (
                    str(
                        error,
                    )
                    if isinstance(
                        error,
                        ResourceSyncError,
                    )
                    else "Resource synchronization failed."
                )

                await session.commit()

                raise

            try:
                account = await require_connection_revision(
                    session,
                    account_id=account_id,
                    expected_revision=connection_revision,
                    required_status="connected",
                    for_update=True,
                )

            except StaleCloudAccountConnectionError:
                await session.rollback()

                return _stale_result(
                    account_id_text,
                )

            account.sync_status = "succeeded"
            account.last_sync_error = None

            await session.commit()

            return statistics.to_dict()

    finally:
        await engine.dispose()


@celery_app.task(
    name="cloudops.sync_aws_account",
)
def sync_aws_account_task(
    account_id: str,
    connection_revision: int,
) -> dict[str, int | str]:
    return asyncio.run(
        _run_account_sync(
            account_id,
            connection_revision,
        ),
    )


async def _get_connected_aws_accounts(
    *,
    skip_busy_resource_syncs: bool = False,
) -> list[
    tuple[
        str,
        int,
    ]
]:
    """Return account ID plus revision captured at scheduling time."""

    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
    )

    session_factory = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        async with session_factory() as session:
            statement = select(
                CloudAccount.id,
                CloudAccount.connection_revision,
            ).where(
                CloudAccount.provider == "aws",
                CloudAccount.status == "connected",
            )

            if skip_busy_resource_syncs:
                statement = statement.where(
                    CloudAccount.sync_status.notin_(
                        [
                            "queued",
                            "running",
                        ],
                    ),
                )

            result = await session.execute(
                statement,
            )

            return [
                (
                    str(
                        account_id,
                    ),
                    connection_revision,
                )
                for account_id, connection_revision in result.all()
            ]

    finally:
        await engine.dispose()


async def _run_metric_sync(
    account_id_text: str,
    connection_revision: int,
) -> dict[str, int | str]:
    account_id = UUID(
        account_id_text,
    )

    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
    )

    session_factory = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        async with session_factory() as session:
            try:
                samples = await MonitoringSyncService(
                    session,
                ).sync_account(
                    account_id,
                    connection_revision,
                )

            except StaleCloudAccountConnectionError:
                await session.rollback()

                return _stale_result(
                    account_id_text,
                )

            return {
                "account_id": account_id_text,
                "samples_upserted": samples,
            }

    finally:
        await engine.dispose()


async def _run_cost_sync(
    account_id_text: str,
    connection_revision: int,
) -> dict[str, int | str]:
    account_id = UUID(
        account_id_text,
    )

    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
    )

    session_factory = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    try:
        async with session_factory() as session:
            try:
                records = await CostSyncService(
                    session,
                ).sync_account(
                    account_id,
                    connection_revision,
                )

            except StaleCloudAccountConnectionError:
                await session.rollback()

                return _stale_result(
                    account_id_text,
                )

            return {
                "account_id": account_id_text,
                "records_imported": records,
            }

    finally:
        await engine.dispose()


@celery_app.task(
    name="cloudops.sync_aws_metrics",
)
def sync_aws_metrics_task(
    account_id: str,
    connection_revision: int,
) -> dict[str, int | str]:
    return asyncio.run(
        _run_metric_sync(
            account_id,
            connection_revision,
        ),
    )


@celery_app.task(
    name="cloudops.sync_aws_costs",
)
def sync_aws_costs_task(
    account_id: str,
    connection_revision: int,
) -> dict[str, int | str]:
    return asyncio.run(
        _run_cost_sync(
            account_id,
            connection_revision,
        ),
    )


@celery_app.task(
    name="cloudops.schedule_all_aws_resource_syncs",
)
def schedule_all_aws_resource_syncs_task() -> dict[str, int]:
    accounts = asyncio.run(
        _get_connected_aws_accounts(
            skip_busy_resource_syncs=True,
        ),
    )

    for account_id, connection_revision in accounts:
        sync_aws_account_task.delay(
            account_id,
            connection_revision,
        )

    return {
        "scheduled": len(
            accounts,
        ),
    }


@celery_app.task(
    name="cloudops.schedule_all_aws_metric_syncs",
)
def schedule_all_aws_metric_syncs_task() -> dict[str, int]:
    accounts = asyncio.run(
        _get_connected_aws_accounts(),
    )

    for account_id, connection_revision in accounts:
        sync_aws_metrics_task.delay(
            account_id,
            connection_revision,
        )

    return {
        "scheduled": len(
            accounts,
        ),
    }


@celery_app.task(
    name="cloudops.schedule_all_aws_cost_syncs",
)
def schedule_all_aws_cost_syncs_task() -> dict[str, int]:
    accounts = asyncio.run(
        _get_connected_aws_accounts(),
    )

    for account_id, connection_revision in accounts:
        sync_aws_costs_task.delay(
            account_id,
            connection_revision,
        )

    return {
        "scheduled": len(
            accounts,
        ),
    }
