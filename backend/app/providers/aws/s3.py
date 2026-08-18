# Import Boto3 session typing.
from boto3.session import Session

# Import Botocore client errors.
from botocore.exceptions import ClientError

# Import normalization helpers.
from app.providers.aws.helpers import (
    normalize_environment,
    normalize_owner,
    normalize_tags,
)

# Import shared client configuration.
from app.providers.aws.session import (
    AWS_CLIENT_CONFIG,
)

# Import normalized resource type.
from app.providers.aws.types import (
    AwsDiscoveredResource,
)


# Discover S3 general-purpose buckets.
def discover_s3_buckets(
    # Receive authenticated AWS session.
    session: Session,
    # Receive expected account ID.
    account_id: str,
    # Receive regions CloudOps is configured to monitor.
    enabled_regions: tuple[
        str,
        ...,
    ],
) -> list[AwsDiscoveredResource]:
    # Create S3 client.
    client = session.client(
        "s3",
        config=AWS_CLIENT_CONFIG,
    )

    # Create the modern paginated ListBuckets operation.
    paginator = client.get_paginator(
        "list_buckets",
    )

    # Store normalized S3 resources.
    resources: list[AwsDiscoveredResource] = []

    # Paginate bucket inventory.
    for page in paginator.paginate(
        PaginationConfig={
            # Keep API responses reasonably sized.
            "PageSize": 100,
        },
    ):
        # Process every returned bucket.
        for bucket in page.get(
            "Buckets",
            [],
        ):
            # Read bucket name.
            bucket_name = bucket["Name"]

            # Read region returned by paginated ListBuckets.
            bucket_region = bucket.get(
                "BucketRegion",
            )

            # Ignore buckets outside configured discovery regions.
            if bucket_region and bucket_region not in enabled_regions:
                continue

            # Use the default AWS region when older responses omit BucketRegion.
            region = bucket_region or "us-east-1"

            try:
                # Read bucket tags.
                tag_response = client.get_bucket_tagging(
                    Bucket=bucket_name,
                    ExpectedBucketOwner=account_id,
                )

                # Normalize bucket tags.
                tags = normalize_tags(
                    tag_response.get(
                        "TagSet",
                    ),
                )

            except ClientError as error:
                # Read AWS error code.
                error_code = error.response.get(
                    "Error",
                    {},
                ).get(
                    "Code",
                )

                # Buckets are allowed to have no tags.
                if error_code == "NoSuchTagSet":
                    # Represent missing tags as an empty mapping.
                    tags = {}

                else:
                    # Preserve genuine authorization/provider failures.
                    raise

            # Add normalized bucket.
            resources.append(
                AwsDiscoveredResource(
                    # S3 bucket names are provider identifiers.
                    provider_resource_id=bucket_name,
                    # Construct standard bucket ARN.
                    arn=f"arn:aws:s3:::{bucket_name}",
                    # Use bucket name for display.
                    name=bucket_name,
                    # Classify AWS service.
                    service="S3",
                    # Store CloudFormation-style type.
                    resource_type="AWS::S3::Bucket",
                    # Store bucket region.
                    region=region,
                    # S3 buckets are regional rather than zonal.
                    availability_zone=None,
                    # Normalize environment.
                    environment=normalize_environment(
                        tags,
                    ),
                    # Normalize owner.
                    owner=normalize_owner(
                        tags,
                    ),
                    # Buckets returned by AWS exist and are available.
                    cloud_state="available",
                    # Store simple bucket metadata.
                    metadata={
                        "creation_date": (
                            bucket["CreationDate"].isoformat()
                            if bucket.get(
                                "CreationDate",
                            )
                            else None
                        ),
                    },
                    # Store bucket tags.
                    tags=tags,
                ),
            )

    # Return normalized S3 inventory.
    return resources
