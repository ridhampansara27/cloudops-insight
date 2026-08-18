"""Local validation helpers for AWS account registration."""

import re

AWS_ROLE_ARN_PATTERN = re.compile(
    r"^arn:aws:iam::(?P<account_id>\d{12}):role/(?P<role_name>[\w+=,.@/-]+)$"
)


class AWSAccountValidationError(ValueError):
    """Raised when AWS account metadata is internally inconsistent."""


def validate_aws_account_configuration(
    external_account_id: str,
    role_arn: str,
) -> None:
    """Validate an AWS role ARN without making an AWS API call."""

    match = AWS_ROLE_ARN_PATTERN.fullmatch(role_arn)

    if match is None:
        raise AWSAccountValidationError("Invalid AWS IAM role ARN")

    arn_account_id = match.group("account_id")

    if arn_account_id != external_account_id:
        raise AWSAccountValidationError("AWS account ID does not match IAM role ARN")
