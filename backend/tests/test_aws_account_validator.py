"""Unit tests for secure AWS account metadata validation."""

import pytest

from app.services.aws_account_validator import (
    AWSAccountValidationError,
    validate_aws_account_configuration,
    validate_aws_account_id,
)


def test_accepts_valid_aws_account_id() -> None:
    validate_aws_account_id(
        "902664897666",
    )


@pytest.mark.parametrize(
    "account_id",
    [
        "",
        "123",
        "12345678901",
        "1234567890123",
        "ABCDEFGHIJKL",
        "12345678901A",
    ],
)
def test_rejects_invalid_aws_account_id(
    account_id: str,
) -> None:
    with pytest.raises(
        AWSAccountValidationError,
        match="exactly 12 digits",
    ):
        validate_aws_account_id(
            account_id,
        )


def test_requires_cross_account_role() -> None:
    with pytest.raises(
        AWSAccountValidationError,
        match="IAM role ARN is required",
    ):
        validate_aws_account_configuration(
            "902664897666",
            None,
        )


def test_accepts_matching_role_arn() -> None:
    validate_aws_account_configuration(
        "902664897666",
        "arn:aws:iam::902664897666:role/CloudOpsInsightReadOnlyRole",
    )


def test_accepts_role_path() -> None:
    validate_aws_account_configuration(
        "902664897666",
        "arn:aws:iam::902664897666:role/cloudops/CloudOpsInsightReadOnlyRole",
    )


def test_rejects_mismatched_role_account() -> None:
    with pytest.raises(
        AWSAccountValidationError,
        match="does not match IAM role ARN",
    ):
        validate_aws_account_configuration(
            "902664897666",
            "arn:aws:iam::123456789012:role/CloudOpsInsightReadOnlyRole",
        )


def test_rejects_non_role_arn() -> None:
    with pytest.raises(
        AWSAccountValidationError,
        match="Invalid AWS IAM role ARN",
    ):
        validate_aws_account_configuration(
            "902664897666",
            "arn:aws:iam::902664897666:user/not-a-role",
        )
