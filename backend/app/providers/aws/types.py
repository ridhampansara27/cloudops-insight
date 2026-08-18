# Import Python dataclass utilities.
from dataclasses import dataclass, field

# Import flexible metadata typing.
from typing import Any


# Represent the AWS identity returned by STS.
@dataclass(
    frozen=True,
    slots=True,
)
class AwsIdentity:
    # Store the AWS account ID.
    account_id: str

    # Store the caller's AWS ARN.
    arn: str

    # Store the provider-native caller identifier.
    user_id: str


# Represent the information required to access one AWS account.
@dataclass(
    frozen=True,
    slots=True,
)
class AwsAccountConfig:
    # Store the expected AWS account ID.
    account_id: str

    # Store the optional role that CloudOps should assume.
    role_arn: str | None

    # Store the optional STS ExternalId.
    external_id: str | None

    # Store regions enabled for inventory discovery.
    enabled_regions: tuple[str, ...]


# Represent one normalized resource discovered from AWS.
@dataclass(
    slots=True,
)
class AwsDiscoveredResource:
    # Store AWS' provider-native resource identifier.
    provider_resource_id: str

    # Store the ARN when available.
    arn: str | None

    # Store the resource's visible name.
    name: str

    # Store the CloudOps service classification.
    service: str

    # Store the AWS CloudFormation-style resource type.
    resource_type: str

    # Store the AWS region.
    region: str

    # Store availability zone when applicable.
    availability_zone: str | None

    # Store the normalized environment tag.
    environment: str | None

    # Store the normalized ownership tag.
    owner: str | None

    # Store the AWS-native resource state.
    cloud_state: str

    # Store provider-specific metadata.
    metadata: dict[str, Any] = field(
        default_factory=dict,
    )

    # Store normalized AWS tags.
    tags: dict[str, str] = field(
        default_factory=dict,
    )
