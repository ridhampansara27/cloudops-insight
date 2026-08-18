# Import Boto3 session typing.
from boto3.session import Session

# Import AWS normalization helpers.
from app.providers.aws.helpers import (
    normalize_environment,
    normalize_owner,
    normalize_tags,
)

# Import shared client configuration.
from app.providers.aws.session import (
    AWS_CLIENT_CONFIG,
)

# Import normalized resource model.
from app.providers.aws.types import (
    AwsDiscoveredResource,
)


# Discover provisioned RDS database instances.
def discover_rds_instances(
    # Receive authenticated AWS session.
    session: Session,
    # Receive AWS region.
    region: str,
) -> list[AwsDiscoveredResource]:
    # Create regional RDS client.
    client = session.client(
        "rds",
        region_name=region,
        config=AWS_CLIENT_CONFIG,
    )

    # Use AWS-supported pagination.
    paginator = client.get_paginator(
        "describe_db_instances",
    )

    # Store discovered databases.
    resources: list[AwsDiscoveredResource] = []

    # Process every API page.
    for page in paginator.paginate():
        # Process every database instance.
        for database in page.get(
            "DBInstances",
            [],
        ):
            # Read database ARN.
            arn = database["DBInstanceArn"]

            # Retrieve database tags.
            tag_response = client.list_tags_for_resource(
                ResourceName=arn,
            )

            # Normalize RDS tags.
            tags = normalize_tags(
                tag_response.get(
                    "TagList",
                ),
            )

            # Read provider-native identifier.
            identifier = database["DBInstanceIdentifier"]

            # Add normalized database.
            resources.append(
                AwsDiscoveredResource(
                    # Store provider ID.
                    provider_resource_id=identifier,
                    # Store RDS ARN.
                    arn=arn,
                    # Use Name tag when available.
                    name=tags.get(
                        "Name",
                        identifier,
                    ),
                    # Classify service.
                    service="RDS",
                    # Store resource type.
                    resource_type="AWS::RDS::DBInstance",
                    # Store region.
                    region=region,
                    # Store database availability zone.
                    availability_zone=database.get(
                        "AvailabilityZone",
                    ),
                    # Normalize deployment environment.
                    environment=normalize_environment(
                        tags,
                    ),
                    # Normalize ownership.
                    owner=normalize_owner(
                        tags,
                    ),
                    # Store AWS database lifecycle state.
                    cloud_state=database.get(
                        "DBInstanceStatus",
                        "unknown",
                    ),
                    # Store useful database metadata.
                    metadata={
                        "engine": database.get(
                            "Engine",
                        ),
                        "engine_version": database.get(
                            "EngineVersion",
                        ),
                        "instance_class": database.get(
                            "DBInstanceClass",
                        ),
                        "multi_az": database.get(
                            "MultiAZ",
                        ),
                        "storage_type": database.get(
                            "StorageType",
                        ),
                        "allocated_storage_gib": database.get(
                            "AllocatedStorage",
                        ),
                    },
                    # Store provider tags.
                    tags=tags,
                ),
            )

    # Return databases.
    return resources
