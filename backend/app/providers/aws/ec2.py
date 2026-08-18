# Import the Boto3 Session type.
from boto3.session import Session

# Import AWS normalization helpers.
from app.providers.aws.helpers import (
    normalize_environment,
    normalize_owner,
    normalize_tags,
)

# Import AWS client configuration.
from app.providers.aws.session import (
    AWS_CLIENT_CONFIG,
)

# Import normalized resource type.
from app.providers.aws.types import (
    AwsDiscoveredResource,
)


# Discover EC2 instances in one AWS region.
def discover_ec2_instances(
    # Receive authenticated AWS session.
    session: Session,
    # Receive target AWS account ID.
    account_id: str,
    # Receive target AWS region.
    region: str,
) -> list[AwsDiscoveredResource]:
    # Create regional EC2 client.
    client = session.client(
        "ec2",
        region_name=region,
        config=AWS_CLIENT_CONFIG,
    )

    # Create AWS-provided pagination.
    paginator = client.get_paginator(
        "describe_instances",
    )

    # Store normalized resources.
    resources: list[AwsDiscoveredResource] = []

    # Retrieve every EC2 page.
    for page in paginator.paginate():
        # Process each EC2 reservation.
        for reservation in page.get(
            "Reservations",
            [],
        ):
            # Process every instance in the reservation.
            for instance in reservation.get(
                "Instances",
                [],
            ):
                # Normalize EC2 tags.
                tags = normalize_tags(
                    instance.get(
                        "Tags",
                    ),
                )

                # Read the instance ID.
                instance_id = instance["InstanceId"]

                # Use Name tag when available.
                name = tags.get(
                    "Name",
                    instance_id,
                )

                # Read native EC2 state.
                state = instance.get(
                    "State",
                    {},
                ).get(
                    "Name",
                    "unknown",
                )

                # Add normalized resource.
                resources.append(
                    AwsDiscoveredResource(
                        # Store EC2 instance ID.
                        provider_resource_id=instance_id,
                        # Construct standard AWS EC2 ARN.
                        arn=(
                            f"arn:aws:ec2:{region}:{account_id}:instance/{instance_id}"
                        ),
                        # Store display name.
                        name=name,
                        # Classify AWS service.
                        service="EC2",
                        # Store CloudFormation-style type.
                        resource_type="AWS::EC2::Instance",
                        # Store region.
                        region=region,
                        # Store availability zone.
                        availability_zone=(
                            instance.get(
                                "Placement",
                                {},
                            ).get(
                                "AvailabilityZone",
                            )
                        ),
                        # Normalize environment tags.
                        environment=normalize_environment(
                            tags,
                        ),
                        # Normalize owner tags.
                        owner=normalize_owner(
                            tags,
                        ),
                        # Store native instance lifecycle state.
                        cloud_state=state,
                        # Store useful non-sensitive EC2 metadata.
                        metadata={
                            "instance_type": instance.get(
                                "InstanceType",
                            ),
                            "image_id": instance.get(
                                "ImageId",
                            ),
                            "vpc_id": instance.get(
                                "VpcId",
                            ),
                            "subnet_id": instance.get(
                                "SubnetId",
                            ),
                            "private_ip": instance.get(
                                "PrivateIpAddress",
                            ),
                        },
                        # Store AWS tags.
                        tags=tags,
                    ),
                )

    # Return normalized EC2 inventory.
    return resources
