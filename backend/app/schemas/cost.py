# Import Python's date type.
from datetime import date

# Import Pydantic's schema base.
from pydantic import BaseModel


# Define aggregated service spending.
class ServiceCostRead(BaseModel):
    # Return the AWS service.
    service: str

    # Return accumulated spending.
    amount: float


# Define one daily cost point.
class DailyCostRead(BaseModel):
    # Return the billing date.
    date: date

    # Return spending for that day.
    amount: float


# Define the Cost Overview API response.
class CostSummaryRead(BaseModel):
    # Return current month-to-date spending.
    month_to_date: float

    # Return service-level spending.
    by_service: list[ServiceCostRead]

    # Return daily time-series spending.
    daily: list[DailyCostRead]

    # Return the reporting currency.
    currency: str

    # Tell clients whether AWS resource-level billing records
    # are currently available in CloudOps.
    resource_level_available: bool
