# Import UUID typing.
# Import datetime typing.
from datetime import datetime
from uuid import UUID

# Import Pydantic schema base.
from pydantic import BaseModel


# Describe one completed resource synchronization.
class ResourceSyncResponse(
    BaseModel,
):
    # Return CloudOps account UUID.
    account_id: UUID

    # Return AWS resources discovered.
    discovered: int

    # Return newly created resources.
    created: int

    # Return refreshed existing resources.
    updated: int

    # Return previously inactive resources reactivated.
    reactivated: int

    # Return missing resources marked inactive.
    deactivated: int

    # Return tags created.
    tags_created: int

    # Return tags changed.
    tags_updated: int

    # Return tags removed.
    tags_deleted: int


# Describe a newly queued AWS synchronization.
class ResourceSyncQueuedResponse(
    BaseModel,
):
    # Return cloud-account UUID.
    account_id: UUID

    # Return Celery task identifier.
    task_id: str

    # Return current queue status.
    status: str


# Describe account synchronization state.
class ResourceSyncStatusResponse(
    BaseModel,
):
    # Return cloud-account UUID.
    account_id: UUID

    # Return queue/worker state.
    sync_status: str

    # Return most recent task start time.
    sync_started_at: datetime | None

    # Return most recent successful inventory sync.
    last_synced_at: datetime | None

    # Return safe failure information.
    last_sync_error: str | None
