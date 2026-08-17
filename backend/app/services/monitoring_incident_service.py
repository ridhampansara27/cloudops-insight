# Import UTC-aware datetime helpers.
from datetime import (
    UTC,
    datetime,
)

# Import SQLAlchemy querying.
from sqlalchemy import select

# Import asynchronous session.
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

# Import incident model.
from app.models.incident import (
    Incident,
)

# Import cloud resource model.
from app.models.resource import (
    CloudResource,
)

# Import explainable health result.
from app.services.health_evaluation_service import (
    HealthEvaluation,
)


# Synchronize incidents with calculated monitoring health.
class MonitoringIncidentService:
    # Store database session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    # Reconcile one resource's monitoring incident.
    async def reconcile(
        self,
        *,
        resource: CloudResource,
        evaluation: HealthEvaluation,
    ) -> None:
        # Find an unresolved automated monitoring incident.
        result = await self.session.execute(
            select(
                Incident,
            ).where(
                Incident.resource_id == resource.id,
                Incident.source == "monitoring",
                Incident.status != "resolved",
            ),
        )

        # Retrieve the current active monitoring incident.
        existing = result.scalars().first()

        # Create an incident only for critical health.
        if evaluation.state == "critical":
            # Update existing incident explanation.
            if existing is not None:
                existing.description = evaluation.reason
                return

            # Create a new automatically detected incident.
            self.session.add(
                Incident(
                    resource_id=(resource.id),
                    severity="critical",
                    title=(f"{resource.service} health threshold breached"),
                    description=(evaluation.reason),
                    status="open",
                    started_at=(
                        datetime.now(
                            UTC,
                        )
                    ),
                    source="monitoring",
                ),
            )

            # Reconciliation is complete.
            return

        # Resolve the automated incident when the critical condition disappears.
        if existing is not None:
            # Mark incident resolved.
            existing.status = "resolved"

            # Record resolution time.
            existing.resolved_at = datetime.now(
                UTC,
            )
