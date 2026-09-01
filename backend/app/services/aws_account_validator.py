"""Local validation helpers for AWS account registration."""

import re

AWS_ROLE_ARN_PATTERN = re.compile(
    r"^arn:aws:iam::(?P<account_id>\d{12}):role/(?P<role_name>[\w+=,.@/-]+)$"
)


class AWSAccountValidationError(ValueError):
    """Raised when AWS account metadata is internally inconsistent."""


def validate_aws_account_configuration(
    external_account_id: str,
    role_arn: str | None,
) -> None:
    """Validate an optional AWS role ARN without making an AWS API call."""

    # No role ARN means CloudOps should use its own base AWS identity.
    # This is the expected configuration for same-account EKS discovery.
    if role_arn is None:
        return

    # Validate the supplied IAM role ARN.
    match = AWS_ROLE_ARN_PATTERN.fullmatch(
        role_arn,
    )

    if match is None:
        raise AWSAccountValidationError(
            "Invalid AWS IAM role ARN",
        )

    # Read the AWS account embedded in the ARN.
    arn_account_id = match.group(
        "account_id",
    )

    # Prevent connecting an ARN belonging to another account ID by mistake.
    if arn_account_id != external_account_id:
        raise AWSAccountValidationError(
            "AWS account ID does not match IAM role ARN",
        )