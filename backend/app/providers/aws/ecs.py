# Import Boto3 session typing.
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

# Import normalized resource model.
from app.providers.aws.types import (
    AwsDiscoveredResource,
)


# Split values into fixed-size batches.
def chunked(
    # Receive values.
    values: list[str],
    # Receive batch size.
    size: int,
) -> list[list[str]]:
    # Return slices of the requested size.
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


# Discover ECS clusters and services.
def discover_ecs_resources(
    # Receive authenticated AWS session.
    session: Session,
    # Receive region.
    region: str,
) -> list[AwsDiscoveredResource]:
    # Create regional ECS client.
    client = session.client(
        "ecs",
        region_name=region,
        config=AWS_CLIENT_CONFIG,
    )

    # Create cluster paginator.
    cluster_paginator = client.get_paginator(
        "list_clusters",
    )

    # Store cluster ARNs.
    cluster_arns: list[str] = []

    # Retrieve every ECS cluster.
    for page in cluster_paginator.paginate():
        # Add cluster ARNs.
        cluster_arns.extend(
            page.get(
                "clusterArns",
                [],
            ),
        )

    # Store normalized resources.
    resources: list[AwsDiscoveredResource] = []

    # Process every cluster.
    for cluster_arn in cluster_arns:
        # Retrieve cluster metadata and tags.
        cluster_response = client.describe_clusters(
            clusters=[
                cluster_arn,
            ],
            include=[
                "TAGS",
            ],
        )

        # Process returned cluster.
        for cluster in cluster_response.get(
            "clusters",
            [],
        ):
            # Normalize cluster tags.
            cluster_tags = normalize_tags(
                cluster.get(
                    "tags",
                ),
            )

            # Store the ECS cluster itself.
            resources.append(
                AwsDiscoveredResource(
                    # Use cluster ARN as provider ID.
                    provider_resource_id=cluster["clusterArn"],
                    # Store ARN.
                    arn=cluster["clusterArn"],
                    # Store cluster name.
                    name=cluster["clusterName"],
                    # Classify service.
                    service="ECS",
                    # Store cluster type.
                    resource_type="AWS::ECS::Cluster",
                    # Store region.
                    region=region,
                    # ECS clusters are regional.
                    availability_zone=None,
                    # Normalize environment.
                    environment=normalize_environment(
                        cluster_tags,
                    ),
                    # Normalize owner.
                    owner=normalize_owner(
                        cluster_tags,
                    ),
                    # Store cluster lifecycle state.
                    cloud_state=cluster.get(
                        "status",
                        "unknown",
                    ).lower(),
                    # Store useful cluster metadata.
                    metadata={
                        "running_tasks": cluster.get(
                            "runningTasksCount",
                            0,
                        ),
                        "pending_tasks": cluster.get(
                            "pendingTasksCount",
                            0,
                        ),
                        "active_services": cluster.get(
                            "activeServicesCount",
                            0,
                        ),
                    },
                    # Store provider tags.
                    tags=cluster_tags,
                ),
            )

        # Create service paginator for this cluster.
        service_paginator = client.get_paginator(
            "list_services",
        )

        # Store service ARNs.
        service_arns: list[str] = []

        # Retrieve every service in this cluster.
        for page in service_paginator.paginate(
            cluster=cluster_arn,
        ):
            # Collect service ARNs.
            service_arns.extend(
                page.get(
                    "serviceArns",
                    [],
                ),
            )

        # Describe ECS services in batches of ten.
        for service_batch in chunked(
            service_arns,
            10,
        ):
            # Skip empty batches.
            if not service_batch:
                continue

            # Retrieve detailed service data and tags.
            service_response = client.describe_services(
                cluster=cluster_arn,
                services=service_batch,
                include=[
                    "TAGS",
                ],
            )

            # Normalize every service.
            for service in service_response.get(
                "services",
                [],
            ):
                # Normalize service tags.
                service_tags = normalize_tags(
                    service.get(
                        "tags",
                    ),
                )

                # Add ECS service resource.
                resources.append(
                    AwsDiscoveredResource(
                        # Use service ARN as provider ID.
                        provider_resource_id=service["serviceArn"],
                        # Store service ARN.
                        arn=service["serviceArn"],
                        # Store ECS service name.
                        name=service["serviceName"],
                        # Classify service.
                        service="ECS",
                        # Store resource type.
                        resource_type="AWS::ECS::Service",
                        # Store region.
                        region=region,
                        # ECS services are regional.
                        availability_zone=None,
                        # Normalize environment.
                        environment=normalize_environment(
                            service_tags,
                        ),
                        # Normalize ownership.
                        owner=normalize_owner(
                            service_tags,
                        ),
                        # Store ECS service status.
                        cloud_state=service.get(
                            "status",
                            "unknown",
                        ).lower(),
                        # Store useful service metadata.
                        metadata={
                            "desired_count": service.get(
                                "desiredCount",
                                0,
                            ),
                            "running_count": service.get(
                                "runningCount",
                                0,
                            ),
                            "pending_count": service.get(
                                "pendingCount",
                                0,
                            ),
                            "launch_type": service.get(
                                "launchType",
                            ),
                        },
                        # Store provider tags.
                        tags=service_tags,
                    ),
                )

    # Return normalized ECS inventory.
    return resources
