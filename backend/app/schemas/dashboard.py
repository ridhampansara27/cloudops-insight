# Import Pydantic's schema base.
# Import datetime typing.
from datetime import datetime

from pydantic import BaseModel


# Define the dashboard KPI response.
class DashboardSummary(BaseModel):
    # Return discovered resource count.
    total_resources: int

    # Return healthy resource count.
    healthy_resources: int

    # Return warning resource count.
    warning_resources: int

    # Return critical resource count.
    critical_resources: int

    # Return active incident count.
    active_incidents: int

    # Return current-month cloud spending.
    month_to_date_cost: float

    # Return potential optimization savings.
    potential_monthly_savings: float

    # Return cost currency.
    currency: str

    # Return the latest completed resource synchronization.
    last_resource_sync_at: datetime | None
