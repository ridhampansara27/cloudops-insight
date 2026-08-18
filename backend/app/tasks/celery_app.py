# Import Celery.
from celery import Celery

# Import Celery crontab scheduling.
from celery.schedules import (
    crontab,
)

# Import application configuration.
from app.core.config import settings

# Create the CloudOps background worker application.
celery_app = Celery(
    # Give the worker application a readable name.
    "cloudops-insight",
    # Use Redis for task delivery.
    broker=settings.celery_broker_url,
    # Store task results in Redis.
    backend=settings.celery_result_backend,
    # Import CloudOps task modules when the worker starts.
    include=[
        "app.tasks.aws_sync",
    ],
)

# Configure periodic CloudOps jobs.
celery_app.conf.beat_schedule = {
    # Refresh AWS resource inventory every hour.
    "aws-resource-discovery-hourly": {
        "task": ("cloudops.schedule_all_aws_resource_syncs"),
        "schedule": crontab(
            minute=5,
        ),
    },
    # Collect CloudWatch metrics every fifteen minutes.
    "aws-cloudwatch-metrics": {
        "task": ("cloudops.schedule_all_aws_metric_syncs"),
        "schedule": crontab(
            minute="*/15",
        ),
    },
    # Cost Explorer does not require frequent polling.
    "aws-cost-explorer-daily": {
        "task": ("cloudops.schedule_all_aws_cost_syncs"),
        "schedule": crontab(
            hour=6,
            minute=15,
        ),
    },
}


# Configure safe interoperable task serialization.
celery_app.conf.update(
    # Serialize task arguments as JSON.
    task_serializer="json",
    # Accept JSON messages only.
    accept_content=[
        "json",
    ],
    # Serialize task results as JSON.
    result_serializer="json",
    # Use UTC for distributed task timestamps.
    timezone="UTC",
    # Explicitly enable UTC handling.
    enable_utc=True,
    # Expose STARTED task state.
    task_track_started=True,
    # Retry connecting to Redis when the worker starts.
    broker_connection_retry_on_startup=True,
)
