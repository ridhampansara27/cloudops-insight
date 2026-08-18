# Import date typing.
# Import dataclass support.
from dataclasses import dataclass
from datetime import date

# Import Decimal for financial precision.
from decimal import Decimal

# Import Boto3 session.
from boto3.session import Session

# Import AWS client configuration.
from app.providers.aws.session import (
    AWS_CLIENT_CONFIG,
)


# Describe one daily AWS service cost.
@dataclass(
    frozen=True,
    slots=True,
)
class AwsDailyServiceCost:
    # Store billing date.
    usage_date: date

    # Store AWS service name.
    service: str

    # Store precise cost.
    amount: Decimal

    # Store billing currency.
    currency: str

    # Store AWS estimate state.
    estimated: bool


# Describe one resource-level AWS cost.
@dataclass(
    frozen=True,
    slots=True,
)
class AwsDailyResourceCost:
    # Store billing date.
    usage_date: date

    # Store provider resource ID.
    resource_id: str

    # Store precise cost.
    amount: Decimal

    # Store billing currency.
    currency: str

    # Store AWS estimate state.
    estimated: bool


# Retrieve normalized AWS Cost Explorer data.
class CostExplorerProvider:
    # Create Cost Explorer client.
    def _client(
        self,
        session: Session,
    ):
        # Cost Explorer uses its global endpoint through us-east-1.
        return session.client(
            "ce",
            region_name="us-east-1",
            config=AWS_CLIENT_CONFIG,
        )

    # Retrieve daily cost grouped by AWS service.
    def get_daily_service_costs(
        self,
        *,
        session: Session,
        start_date: date,
        end_date: date,
    ) -> list[AwsDailyServiceCost]:
        # Create Cost Explorer client.
        client = self._client(
            session,
        )

        # Store normalized records.
        records: list[AwsDailyServiceCost] = []

        # Start without pagination.
        next_page_token: str | None = None

        # Retrieve every Cost Explorer response page.
        while True:
            # Build request.
            request = {
                "TimePeriod": {
                    "Start": (start_date.isoformat()),
                    "End": (end_date.isoformat()),
                },
                "Granularity": "DAILY",
                "Metrics": [
                    "UnblendedCost",
                ],
                "GroupBy": [
                    {
                        "Type": "DIMENSION",
                        "Key": "SERVICE",
                    },
                ],
            }

            # Continue pagination when necessary.
            if next_page_token:
                request["NextPageToken"] = next_page_token

            # Retrieve AWS billing data.
            response = client.get_cost_and_usage(
                **request,
            )

            # Process daily periods.
            for period in response.get(
                "ResultsByTime",
                [],
            ):
                # Convert billing date.
                usage_date = date.fromisoformat(
                    period["TimePeriod"]["Start"],
                )

                # Read estimate state.
                estimated = bool(
                    period.get(
                        "Estimated",
                        False,
                    ),
                )

                # Process service groups.
                for group in period.get(
                    "Groups",
                    [],
                ):
                    # Read service name.
                    service = group["Keys"][0]

                    # Read monetary result.
                    monetary = group["Metrics"]["UnblendedCost"]

                    # Store normalized record.
                    records.append(
                        AwsDailyServiceCost(
                            usage_date=(usage_date),
                            service=(service),
                            amount=Decimal(
                                monetary["Amount"],
                            ),
                            currency=(monetary["Unit"]),
                            estimated=(estimated),
                        ),
                    )

            # Read pagination token.
            next_page_token = response.get(
                "NextPageToken",
            )

            # Stop after final page.
            if not next_page_token:
                break

        # Return normalized Cost Explorer records.
        return records

    # Retrieve recent EC2 costs grouped by provider resource ID.
    def get_daily_ec2_resource_costs(
        self,
        *,
        session: Session,
        start_date: date,
        end_date: date,
    ) -> list[AwsDailyResourceCost]:
        # Create Cost Explorer client.
        client = self._client(
            session,
        )

        # Store normalized resource costs.
        records: list[AwsDailyResourceCost] = []

        # Start pagination.
        next_page_token: str | None = None

        # Retrieve all pages.
        while True:
            # Build required resource-level query.
            request = {
                "TimePeriod": {
                    "Start": (start_date.isoformat()),
                    "End": (end_date.isoformat()),
                },
                "Granularity": "DAILY",
                "Metrics": [
                    "UnblendedCost",
                ],
                "Filter": {
                    "Dimensions": {
                        "Key": "SERVICE",
                        "Values": [
                            "Amazon Elastic Compute Cloud - Compute",
                        ],
                    },
                },
                "GroupBy": [
                    {
                        "Type": "DIMENSION",
                        "Key": "RESOURCE_ID",
                    },
                ],
            }

            # Continue pagination.
            if next_page_token:
                request["NextPageToken"] = next_page_token

            # Retrieve resource costs.
            response = client.get_cost_and_usage_with_resources(
                **request,
            )

            # Process billing periods.
            for period in response.get(
                "ResultsByTime",
                [],
            ):
                # Read date.
                usage_date = date.fromisoformat(
                    period["TimePeriod"]["Start"],
                )

                # Read estimated flag.
                estimated = bool(
                    period.get(
                        "Estimated",
                        False,
                    ),
                )

                # Process resources.
                for group in period.get(
                    "Groups",
                    [],
                ):
                    # Read provider resource ID.
                    resource_id = group["Keys"][0]

                    # Ignore empty resource grouping.
                    if not resource_id:
                        continue

                    # Read cost information.
                    monetary = group["Metrics"]["UnblendedCost"]

                    # Add normalized record.
                    records.append(
                        AwsDailyResourceCost(
                            usage_date=(usage_date),
                            resource_id=(resource_id),
                            amount=Decimal(
                                monetary["Amount"],
                            ),
                            currency=(monetary["Unit"]),
                            estimated=(estimated),
                        ),
                    )

            # Read pagination.
            next_page_token = response.get(
                "NextPageToken",
            )

            # Stop at final response.
            if not next_page_token:
                break

        # Return resource costs.
        return records
