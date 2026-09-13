"""Security tests for AWS onboarding inputs and generated trust material."""

import re

import pytest
from pydantic import ValidationError

from app.providers.aws.session import (
    AwsSessionConfigurationError,
    AwsSessionFactory,
)
from app.providers.aws.types import AwsAccountConfig
from app.schemas.cloud_account import CloudAccountCreate, CloudAccountUpdate
from app.services.aws_onboarding_service import (
    build_assume_role_trust_policy,
    generate_external_id,
)


def test_external_ids_are_high_entropy_and_unique() -> None:
    values = {
        generate_external_id()
        for _ in range(
            128,
        )
    }

    assert len(values) == 128

    for value in values:
        assert value.startswith(
            "coi_",
        )

        assert len(value) >= 40

        assert re.fullmatch(
            r"[A-Za-z0-9_-]+",
            value,
        )


def test_trust_policy_binds_principal_and_external_id() -> None:
    external_id = generate_external_id()

    principal = "arn:aws:iam::999999999999:role/CloudOpsPlatformRole"

    policy = build_assume_role_trust_policy(
        platform_principal_arn=principal,
        external_id=external_id,
    )

    statement = policy["Statement"][0]

    assert statement["Principal"]["AWS"] == principal

    assert statement["Action"] == "sts:AssumeRole"

    assert statement["Condition"]["StringEquals"]["sts:ExternalId"] == external_id


def test_create_schema_rejects_client_external_id() -> None:
    with pytest.raises(
        ValidationError,
    ):
        CloudAccountCreate.model_validate(
            {
                "name": "AWS",
                "external_account_id": "123456789012",
                "external_id": "attacker-controlled",
            }
        )


def test_create_schema_rejects_client_role_arn() -> None:
    with pytest.raises(
        ValidationError,
    ):
        CloudAccountCreate.model_validate(
            {
                "name": "AWS",
                "external_account_id": "123456789012",
                "role_arn": ("arn:aws:iam::123456789012:role/AttackerSelectedRole"),
            }
        )


def test_update_schema_rejects_client_external_id() -> None:
    with pytest.raises(
        ValidationError,
    ):
        CloudAccountUpdate.model_validate(
            {
                "external_id": "replacement",
            }
        )


def test_update_schema_rejects_client_status() -> None:
    with pytest.raises(
        ValidationError,
    ):
        CloudAccountUpdate.model_validate(
            {
                "status": "connected",
            }
        )


@pytest.mark.parametrize(
    (
        "role_arn",
        "external_id",
        "message",
    ),
    [
        (
            None,
            "coi_valid",
            "cross-account IAM role",
        ),
        (
            "arn:aws:iam::123456789012:role/Test",
            None,
            "ExternalId",
        ),
    ],
)
def test_customer_session_never_falls_back_to_base_credentials(
    role_arn: str | None,
    external_id: str | None,
    message: str,
) -> None:
    account = AwsAccountConfig(
        account_id="123456789012",
        role_arn=role_arn,
        external_id=external_id,
        enabled_regions=("eu-central-1",),
    )

    with pytest.raises(
        AwsSessionConfigurationError,
        match=message,
    ):
        AwsSessionFactory().create_account_session(
            account,
        )
