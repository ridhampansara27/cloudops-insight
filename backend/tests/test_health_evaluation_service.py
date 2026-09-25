"""Regression tests for resource health evaluation."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.models.resource import CloudResource
from app.services.health_evaluation_service import HealthEvaluationService


@pytest.mark.asyncio
async def test_stopped_ec2_cannot_be_healthy_from_stale_metrics() -> None:
    """Treat a stopped EC2 instance as unknown before reading stale metrics."""

    # Use a mocked session because a stopped instance must return before
    # any monitoring query is executed.
    session = AsyncMock()

    # Simulate an EC2 resource whose previous monitoring cycle had marked
    # it healthy before the provider later reported that it was stopped.
    resource = CloudResource(
        cloud_account_id=uuid4(),
        provider_resource_id="i-stopped-health-regression",
        name="Stopped EC2 Regression",
        service="EC2",
        resource_type="AWS::EC2::Instance",
        region="eu-central-1",
        cloud_state="stopped",
        health_state="healthy",
        resource_metadata={},
        is_active=True,
    )

    evaluation = await HealthEvaluationService(
        session,
    ).evaluate(
        resource,
    )

    # A non-running instance has no meaningful runtime-health verdict.
    assert evaluation.state == "unknown"
    assert evaluation.reason == (
        "EC2 instance is not running; runtime health is not evaluated."
    )

    # Most importantly, stale CloudWatch data must not be consulted.
    session.execute.assert_not_awaited()
