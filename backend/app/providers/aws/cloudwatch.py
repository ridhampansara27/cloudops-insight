# Import datetime typing.
from datetime import datetime

# Import Boto3 session typing.
from boto3.session import Session

# Import normalized monitoring contracts.
from app.providers.aws.monitoring_types import (
    AwsMetricPoint,
    AwsMetricQuery,
)

# Import shared AWS client configuration.
from app.providers.aws.session import (
    AWS_CLIENT_CONFIG,
)

# CloudWatch GetMetricData currently accepts up to 500 metric queries.
MAX_METRIC_QUERIES = 500


# Split a sequence into fixed-size chunks.
def chunked[T](
    values: list[T],
    size: int,
) -> list[list[T]]:
    # Return list slices of the requested size.
    return [
        values[index : index + size]
        for index in range(
            0,
            len(values),
            size,
        )
    ]


# Retrieve normalized metric data from Amazon CloudWatch.
class CloudWatchProvider:
    # Retrieve one collection of metric queries.
    def fetch_metrics(
        self,
        *,
        session: Session,
        region: str,
        queries: list[AwsMetricQuery],
        start_time: datetime,
        end_time: datetime,
        period_seconds: int = 300,
    ) -> list[AwsMetricPoint]:
        # Return immediately when there is nothing to query.
        if not queries:
            return []

        # Create the regional CloudWatch client.
        client = session.client(
            "cloudwatch",
            region_name=region,
            config=AWS_CLIENT_CONFIG,
        )

        # Store normalized CloudWatch points.
        points: list[AwsMetricPoint] = []

        # Process at most 500 CloudWatch queries per API call.
        for query_batch in chunked(
            queries,
            MAX_METRIC_QUERIES,
        ):
            # Map generated CloudWatch query IDs back to CloudOps queries.
            query_lookup: dict[
                str,
                AwsMetricQuery,
            ] = {}

            # Build AWS GetMetricData requests.
            metric_data_queries = []

            # Create one AWS query definition per requested metric.
            for index, query in enumerate(
                query_batch,
            ):
                # CloudWatch query IDs must be unique inside one request.
                query_id = f"m{index}"

                # Remember which CloudOps resource this query belongs to.
                query_lookup[query_id] = query

                # Build the CloudWatch metric request.
                metric_data_queries.append(
                    {
                        "Id": query_id,
                        "MetricStat": {
                            "Metric": {
                                "Namespace": (query.namespace),
                                "MetricName": (query.metric_name),
                                "Dimensions": [
                                    {
                                        "Name": name,
                                        "Value": value,
                                    }
                                    for (
                                        name,
                                        value,
                                    ) in query.dimensions
                                ],
                            },
                            "Period": (period_seconds),
                            "Stat": (query.statistic),
                        },
                        "ReturnData": True,
                    },
                )

            # Start without a CloudWatch pagination token.
            next_token: str | None = None

            # Retrieve every response page.
            while True:
                # Build request parameters.
                request = {
                    "MetricDataQueries": (metric_data_queries),
                    "StartTime": (start_time),
                    "EndTime": (end_time),
                    "ScanBy": ("TimestampAscending"),
                }

                # Include pagination token when AWS returned one.
                if next_token:
                    request["NextToken"] = next_token

                # Retrieve metric data.
                response = client.get_metric_data(
                    **request,
                )

                # Process every metric result.
                for result in response.get(
                    "MetricDataResults",
                    [],
                ):
                    # Read the CloudWatch query identifier.
                    query_id = result.get(
                        "Id",
                    )

                    # Ignore unexpected response entries.
                    if not query_id or query_id not in query_lookup:
                        continue

                    # Retrieve the original CloudOps query.
                    query = query_lookup[query_id]

                    # Read timestamps.
                    timestamps = result.get(
                        "Timestamps",
                        [],
                    )

                    # Read values.
                    values = result.get(
                        "Values",
                        [],
                    )

                    # Convert every returned point into the normalized model.
                    for (
                        timestamp,
                        value,
                    ) in zip(
                        timestamps,
                        values,
                        strict=False,
                    ):
                        # Store one normalized metric point.
                        points.append(
                            AwsMetricPoint(
                                resource_id=(query.resource_id),
                                namespace=(query.namespace),
                                metric_name=(query.metric_name),
                                statistic=(query.statistic),
                                value=float(
                                    value,
                                ),
                                unit=(query.unit),
                                timestamp=(timestamp),
                                period_seconds=(period_seconds),
                            ),
                        )

                # Read the next CloudWatch page token.
                next_token = response.get(
                    "NextToken",
                )

                # Stop when CloudWatch has no additional result page.
                if not next_token:
                    break

        # Return all normalized points.
        return points
