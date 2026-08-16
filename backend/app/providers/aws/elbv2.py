# Import Boto3 session type.
from boto3.session import Session

# Import AWS normalization helpers.
from app.providers.aws.helpers import (
    normalize_environment,
    normalize_owner,
    normalize_tags,
)

# Import client configuration.
from app.providers.aws.session import (
    AWS_CLIENT_CONFIG,
)

# Import normalized resource type.
from app.providers.aws.types import (
    AwsDiscoveredResource,
)


# Split a list into fixed-size batches.
def chunked(
    # Receive resource values.
    values: list[str],
    # Receive batch size.
    size: int,
) -> list[list[str]]:
    # Return fixed-size list slices.
    return [
        values[index : index + size]
        for index in range(
            0,
            len(
                values,
            ),
            size,
        )
    ]


# Discover Application, Network, and Gateway Load Balancers.
def discover_load_balancers(
    # Receive authenticated AWS session.
    session: Session,
    # Receive target region.
    region: str,
) -> list[AwsDiscoveredResource]:
    # Create regional ELBv2 client.
    client = session.client(
        "elbv2",
        region_name=region,
        config=AWS_CLIENT_CONFIG,
    )

    # Create AWS paginator.
    paginator = client.get_paginator(
        "describe_load_balancers",
    )

    # Store raw load balancers.
    load_balancers: list[dict[str, object]] = []

    # Collect all provider pages.
    for page in paginator.paginate():
        # Append each returned load balancer.
        load_balancers.extend(
            page.get(
                "LoadBalancers",
                [],
            ),
        )

    # Collect all ARNs.
    arns = [load_balancer["LoadBalancerArn"] for load_balancer in load_balancers]

    # Store tags by ARN.
    tags_by_arn: dict[
        str,
        dict[str, str],
    ] = {}

    # ELB DescribeTags accepts at most twenty ARNs per request.
    for arn_batch in chunked(
        arns,
        20,
    ):
        # Retrieve tags for the current ARN batch.
        response = client.describe_tags(
            ResourceArns=arn_batch,
        )

        # Normalize each tag result.
        for item in response.get(
            "TagDescriptions",
            [],
        ):
            # Read resource ARN.
            resource_arn = item["ResourceArn"]

            # Store normalized provider tags.
            tags_by_arn[resource_arn] = normalize_tags(
                item.get(
                    "Tags",
                ),
            )

    # Store normalized resources.
    resources: list[AwsDiscoveredResource] = []

    # Normalize each load balancer.
    for load_balancer in load_balancers:
        # Read ARN.
        arn = load_balancer["LoadBalancerArn"]

        # Read load-balancer tags.
        tags = tags_by_arn.get(
            arn,
            {},
        )

        # Read visible name.
        name = load_balancer["LoadBalancerName"]

        # Append normalized load balancer.
        resources.append(
            AwsDiscoveredResource(
                # Use ARN as provider identifier.
                provider_resource_id=arn,
                # Store ARN.
                arn=arn,
                # Store load-balancer name.
                name=name,
                # Normalize service name.
                service="ELB",
                # Store provider resource type.
                resource_type=("AWS::ElasticLoadBalancingV2::LoadBalancer"),
                # Store region.
                region=region,
                # Load balancers span multiple availability zones.
                availability_zone=None,
                # Normalize environment.
                environment=normalize_environment(
                    tags,
                ),
                # Normalize owner.
                owner=normalize_owner(
                    tags,
                ),
                # Store native ELB state.
                cloud_state=(
                    load_balancer.get(
                        "State",
                        {},
                    ).get(
                        "Code",
                        "unknown",
                    )
                ),
                # Store useful provider metadata.
                metadata={
                    "type": load_balancer.get(
                        "Type",
                    ),
                    "scheme": load_balancer.get(
                        "Scheme",
                    ),
                    "ip_address_type": load_balancer.get(
                        "IpAddressType",
                    ),
                },
                # Store provider tags.
                tags=tags,
            ),
        )

    # Return normalized load balancers.
    return resources
