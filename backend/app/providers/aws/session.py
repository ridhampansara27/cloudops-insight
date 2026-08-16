# Import AWS SDK.
import boto3

# Import the Boto3 Session type.
from boto3.session import Session

# Import Botocore client configuration.
from botocore.config import Config

# Import application settings.
from app.core.config import settings

# Import AWS account connection configuration.
from app.providers.aws.types import AwsAccountConfig

# Configure retries and network timeouts for AWS API clients.
AWS_CLIENT_CONFIG = Config(
    # Use Botocore's standard retry behavior.
    retries={
        # Limit retry attempts.
        "max_attempts": 4,
        # Use AWS' standard retry mode.
        "mode": "standard",
    },
    # Fail quickly when AWS cannot be reached.
    connect_timeout=5,
    # Avoid indefinitely waiting for provider responses.
    read_timeout=30,
)


# Create AWS sessions without persisting temporary credentials.
class AwsSessionFactory:
    # Create a base AWS SDK session.
    def create_base_session(
        self,
    ) -> Session:
        # Use an explicit development profile when configured.
        if settings.aws_profile_name:
            # Let Boto3 load credentials belonging to the configured profile.
            return boto3.Session(
                profile_name=settings.aws_profile_name,
                region_name=settings.aws_default_region,
            )

        # Otherwise use Boto3's normal credential-provider chain.
        return boto3.Session(
            region_name=settings.aws_default_region,
        )

    # Create an AWS session for one connected account.
    def create_account_session(
        self,
        account: AwsAccountConfig,
    ) -> Session:
        # Create the platform's base AWS identity.
        base_session = self.create_base_session()

        # Use the base identity directly during simple same-account development.
        if account.role_arn is None:
            return base_session

        # Create STS using the platform identity.
        sts_client = base_session.client(
            "sts",
            region_name=settings.aws_default_region,
            config=AWS_CLIENT_CONFIG,
        )

        # Build AssumeRole parameters.
        assume_role_parameters: dict[str, object] = {
            # Identify the target read-only role.
            "RoleArn": account.role_arn,
            # Give CloudTrail a recognizable session name.
            "RoleSessionName": settings.aws_role_session_name,
            # Use temporary credentials for the configured duration.
            "DurationSeconds": settings.aws_role_duration_seconds,
        }

        # Include ExternalId when the account is configured to require it.
        if account.external_id:
            # Supply the expected trust-policy ExternalId.
            assume_role_parameters["ExternalId"] = account.external_id

        # Request temporary role credentials from AWS STS.
        response = sts_client.assume_role(
            **assume_role_parameters,
        )

        # Read the temporary credentials from STS.
        credentials = response["Credentials"]

        # Create a new session using only the temporary assumed-role credentials.
        return boto3.Session(
            # Store the temporary access-key ID only in memory.
            aws_access_key_id=credentials["AccessKeyId"],
            # Store the temporary secret key only in memory.
            aws_secret_access_key=credentials["SecretAccessKey"],
            # Store the temporary session token only in memory.
            aws_session_token=credentials["SessionToken"],
            # Apply the default region.
            region_name=settings.aws_default_region,
        )
