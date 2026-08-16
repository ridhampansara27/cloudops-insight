# Import EC2 discovery.
from app.providers.aws.ec2 import (
    discover_ec2_instances,
)

# Import ECS discovery.
from app.providers.aws.ecs import (
    discover_ecs_resources,
)

# Import ELB discovery.
from app.providers.aws.elbv2 import (
    discover_load_balancers,
)

# Import RDS discovery.
from app.providers.aws.rds import (
    discover_rds_instances,
)

# Import S3 discovery.
from app.providers.aws.s3 import (
    discover_s3_buckets,
)

# Import AWS session creation.
from app.providers.aws.session import (
    AwsSessionFactory,
)

# Import normalized provider types.
from app.providers.aws.types import (
    AwsAccountConfig,
    AwsDiscoveredResource,
)


# Coordinate complete AWS inventory discovery.
class AwsDiscoveryService:
    # Create the discovery service.
    def __init__(
        self,
    ) -> None:
        # Create the AWS session factory.
        self.session_factory = AwsSessionFactory()

    # Discover all currently supported resource types.
    def discover_account(
        self,
        account: AwsAccountConfig,
    ) -> list[AwsDiscoveredResource]:
        # Create authenticated account session.
        session = self.session_factory.create_account_session(
            account,
        )

        # Store normalized inventory.
        resources: list[AwsDiscoveredResource] = []

        # Discover every enabled regional service.
        for region in account.enabled_regions:
            # Discover EC2.
            resources.extend(
                discover_ec2_instances(
                    session=session,
                    account_id=account.account_id,
                    region=region,
                ),
            )

            # Discover RDS.
            resources.extend(
                discover_rds_instances(
                    session=session,
                    region=region,
                ),
            )

            # Discover ECS.
            resources.extend(
                discover_ecs_resources(
                    session=session,
                    region=region,
                ),
            )

            # Discover ELBv2.
            resources.extend(
                discover_load_balancers(
                    session=session,
                    region=region,
                ),
            )

        # Discover S3 once because bucket listing is account-wide.
        resources.extend(
            discover_s3_buckets(
                session=session,
                account_id=account.account_id,
                enabled_regions=account.enabled_regions,
            ),
        )

        # Return complete normalized inventory.
        return resources
