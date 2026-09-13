"""Database-backed generation barrier for cloud integrations."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cloud_account import CloudAccount


class StaleCloudAccountConnectionError(RuntimeError):
    """Raised when queued work targets an obsolete integration generation."""


async def require_connection_revision(
    session: AsyncSession,
    *,
    account_id: UUID,
    expected_revision: int,
    required_status: str,
    for_update: bool = False,
) -> CloudAccount:
    """Load an account only when status and generation are still current.

    With ``for_update=True`` the cloud-account row remains locked until
    the surrounding transaction commits. Disconnect therefore cannot
    commit between this final check and provider-data persistence.
    """

    statement = select(
        CloudAccount,
    ).where(
        CloudAccount.id == account_id,
    )

    if for_update:
        statement = statement.with_for_update()

    statement = statement.execution_options(
        populate_existing=True,
    )

    result = await session.execute(
        statement,
    )

    account = result.scalar_one_or_none()

    if account is None:
        raise StaleCloudAccountConnectionError(
            "Cloud integration no longer exists.",
        )

    if account.connection_revision != expected_revision:
        raise StaleCloudAccountConnectionError(
            "Cloud integration generation changed.",
        )

    if account.status != required_status:
        raise StaleCloudAccountConnectionError(
            "Cloud integration is no longer in the required state.",
        )

    return account
