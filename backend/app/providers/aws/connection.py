"""Validate customer AWS AssumeRole connectivity."""

import logging

from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    NoCredentialsError,
    PartialCredentialsError,
)

from app.providers.aws.session import (
    AWS_CLIENT_CONFIG,
    AwsSessionConfigurationError,
    AwsSessionFactory,
)
from app.providers.aws.types import AwsAccountConfig, AwsIdentity

logger = logging.getLogger(
    __name__,
)


class AwsConnectionError(RuntimeError):
    """Safe application-level AWS connection failure."""


class AwsConnectionService:
    """Validate one configured customer AWS integration."""

    def __init__(
        self,
    ) -> None:
        self.session_factory = AwsSessionFactory()

    def validate_account(
        self,
        account: AwsAccountConfig,
    ) -> AwsIdentity:
        try:
            aws_session = self.session_factory.create_account_session(
                account,
            )

            sts_client = aws_session.client(
                "sts",
                config=AWS_CLIENT_CONFIG,
            )

            response = sts_client.get_caller_identity()

        except AwsSessionConfigurationError as error:
            raise AwsConnectionError(
                str(
                    error,
                ),
            ) from error

        except (
            NoCredentialsError,
            PartialCredentialsError,
        ) as error:
            logger.exception(
                "AWS credentials are not available.",
            )

            raise AwsConnectionError(
                "AWS credentials are not available to CloudOps Insight.",
            ) from error

        except ClientError as error:
            logger.exception(
                "AWS rejected the account connection.",
            )

            error_code = error.response.get(
                "Error",
                {},
            ).get(
                "Code",
                "Unknown",
            )

            raise AwsConnectionError(
                f"AWS rejected the connection: {error_code}.",
            ) from error

        except BotoCoreError as error:
            logger.exception(
                "AWS SDK connection failed.",
            )

            raise AwsConnectionError(
                "CloudOps Insight could not communicate with AWS.",
            ) from error

        account_id = response["Account"]

        if account_id != account.account_id:
            raise AwsConnectionError(
                "Resolved AWS credentials belong to account "
                f"{account_id}, but the configured account is "
                f"{account.account_id}.",
            )

        return AwsIdentity(
            account_id=account_id,
            arn=response["Arn"],
            user_id=response["UserId"],
        )
