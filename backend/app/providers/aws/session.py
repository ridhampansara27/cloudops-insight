"""AWS session creation with mandatory cross-account AssumeRole."""

import boto3
from boto3.session import Session
from botocore.config import Config

from app.core.config import settings
from app.providers.aws.types import AwsAccountConfig

AWS_CLIENT_CONFIG = Config(
    retries={
        "max_attempts": 4,
        "mode": "standard",
    },
    connect_timeout=5,
    read_timeout=30,
)


class AwsSessionConfigurationError(RuntimeError):
    """Raised when a customer AWS integration lacks secure AssumeRole data."""


class AwsSessionFactory:
    """Create AWS sessions without persisting temporary credentials."""

    def create_base_session(
        self,
    ) -> Session:
        """Create the CloudOps platform identity used only to call STS."""

        if settings.aws_profile_name:
            return boto3.Session(
                profile_name=settings.aws_profile_name,
                region_name=settings.aws_default_region,
            )

        return boto3.Session(
            region_name=settings.aws_default_region,
        )

    def create_account_session(
        self,
        account: AwsAccountConfig,
    ) -> Session:
        """Assume the customer's role using the server-generated ExternalId."""

        # Customer integrations must never silently fall back to the
        # CloudOps platform's own AWS credentials.
        if not account.role_arn:
            raise AwsSessionConfigurationError(
                "AWS cross-account IAM role is required."
            )

        if not account.external_id:
            raise AwsSessionConfigurationError("AWS ExternalId is required.")

        base_session = self.create_base_session()

        sts_client = base_session.client(
            "sts",
            region_name=settings.aws_default_region,
            config=AWS_CLIENT_CONFIG,
        )

        response = sts_client.assume_role(
            RoleArn=account.role_arn,
            RoleSessionName=settings.aws_role_session_name,
            DurationSeconds=settings.aws_role_duration_seconds,
            ExternalId=account.external_id,
        )

        credentials = response["Credentials"]

        return boto3.Session(
            aws_access_key_id=credentials["AccessKeyId"],
            aws_secret_access_key=credentials["SecretAccessKey"],
            aws_session_token=credentials["SessionToken"],
            region_name=settings.aws_default_region,
        )
