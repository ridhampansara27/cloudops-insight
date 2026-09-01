# Import pytest for exception assertions.
import pytest

# Import the AWS account validation logic.
from app.services.aws_account_validator import (
    AWSAccountValidationError,
    validate_aws_account_configuration,
)


def test_allows_missing_role_arn() -> None:
    """Allow same-account AWS discovery without AssumeRole."""

    validate_aws_account_configuration(
        "902664897666",
        None,
    )


def test_accepts_matching_role_arn() -> None:
    """Accept a valid IAM role belonging to the supplied AWS account."""

    validate_aws_account_configuration(
        "902664897666",
        "arn:aws:iam::902664897666:role/CloudOpsReadOnlyRole",
    )


def test_rejects_mismatched_role_account() -> None:
    """Reject an IAM role ARN belonging to another AWS account."""

    with pytest.raises(
        AWSAccountValidationError,
        match="AWS account ID does not match IAM role ARN",
    ):
        validate_aws_account_configuration(
            "902664897666",
            "arn:aws:iam::123456789012:role/CloudOpsReadOnlyRole",
        )
