# Import Python logging.
import logging

# Import Botocore exceptions.
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    NoCredentialsError,
    PartialCredentialsError,
)

# Import the shared AWS client configuration.
from app.providers.aws.session import (
    AWS_CLIENT_CONFIG,
    AwsSessionFactory,
)

# Import AWS provider types.
from app.providers.aws.types import (
    AwsAccountConfig,
    AwsIdentity,
)

# Create the module logger.
logger = logging.getLogger(
    __name__,
)


# Define a safe application-level AWS connection error.
class AwsConnectionError(
    RuntimeError,
):
    # Represent AWS authentication or connection failure.
    pass


# Validate connected AWS account credentials.
class AwsConnectionService:
    # Create the service.
    def __init__(
        self,
    ) -> None:
        # Create the shared AWS session factory.
        self.session_factory = AwsSessionFactory()

    # Validate one configured AWS account.
    def validate_account(
        self,
        account: AwsAccountConfig,
    ) -> AwsIdentity:
        try:
            # Create credentials for the requested AWS account.
            aws_session = self.session_factory.create_account_session(
                account,
            )

            # Create an STS client using the resolved credentials.
            sts_client = aws_session.client(
                "sts",
                config=AWS_CLIENT_CONFIG,
            )

            # Ask AWS which identity these credentials represent.
            response = sts_client.get_caller_identity()

        except (
            NoCredentialsError,
            PartialCredentialsError,
        ) as error:
            # Log detailed information only on the backend.
            logger.exception(
                "AWS credentials are not available.",
            )

            # Return a safe application error.
            raise AwsConnectionError(
                "AWS credentials are not available to CloudOps Insight.",
            ) from error

        except ClientError as error:
            # Log the AWS error for backend troubleshooting.
            logger.exception(
                "AWS rejected the account connection.",
            )

            # Extract the AWS error code without exposing credentials.
            error_code = error.response.get(
                "Error",
                {},
            ).get(
                "Code",
                "Unknown",
            )

            # Return a safe provider error.
            raise AwsConnectionError(
                f"AWS rejected the connection: {error_code}.",
            ) from error

        except BotoCoreError as error:
            # Record low-level SDK failure.
            logger.exception(
                "AWS SDK connection failed.",
            )

            # Return a safe application message.
            raise AwsConnectionError(
                "CloudOps Insight could not communicate with AWS.",
            ) from error

        # Read the AWS account ID.
        account_id = response["Account"]

        # Ensure CloudOps connected to the account the user configured.
        if account_id != account.account_id:
            # Reject an accidental connection to another AWS account.
            raise AwsConnectionError(
                "Resolved AWS credentials belong to account "
                f"{account_id}, but the configured account is "
                f"{account.account_id}.",
            )

        # Return normalized identity information.
        return AwsIdentity(
            # Store verified account ID.
            account_id=account_id,
            # Store verified caller ARN.
            arn=response["Arn"],
            # Store verified AWS caller ID.
            user_id=response["UserId"],
        )
