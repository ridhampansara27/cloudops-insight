"""Local validation helpers for AWS commercial onboarding."""

import re

AWS_ACCOUNT_ID_PATTERN = re.compile(
    r"^\d{12}$",
)

AWS_ROLE_ARN_PATTERN = re.compile(
    r"^arn:(?:aws|aws-us-gov|aws-cn):iam::"
    r"(?P<account_id>\d{12}):role/"
    r"(?P<role_name>[\w+=,.@/-]+)$"
)


class AWSAccountValidationError(ValueError):
    """Raised when submitted AWS account metadata is unsafe or inconsistent."""


def validate_aws_account_id(
    external_account_id: str,
) -> None:
    """Require a genuine AWS-style 12-digit account identifier."""

    if (
        AWS_ACCOUNT_ID_PATTERN.fullmatch(
            external_account_id,
        )
        is None
    ):
        raise AWSAccountValidationError(
            "AWS account ID must contain exactly 12 digits.",
        )


def validate_aws_account_configuration(
    external_account_id: str,
    role_arn: str | None,
) -> None:
    """Require a cross-account IAM role belonging to the configured account."""

    validate_aws_account_id(
        external_account_id,
    )

    if not role_arn:
        raise AWSAccountValidationError(
            "AWS IAM role ARN is required.",
        )

    match = AWS_ROLE_ARN_PATTERN.fullmatch(
        role_arn,
    )

    if match is None:
        raise AWSAccountValidationError(
            "Invalid AWS IAM role ARN.",
        )

    arn_account_id = match.group(
        "account_id",
    )

    if arn_account_id != external_account_id:
        raise AWSAccountValidationError(
            "AWS account ID does not match IAM role ARN.",
        )
