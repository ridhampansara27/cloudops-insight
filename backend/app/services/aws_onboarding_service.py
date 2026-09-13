"""Security helpers for commercial AWS cross-account onboarding."""

import secrets

SUGGESTED_ROLE_NAME = "CloudOpsInsightReadOnlyRole"

# 32 random bytes provide 256 bits of randomness before URL-safe encoding.
EXTERNAL_ID_RANDOM_BYTES = 32


def generate_external_id() -> str:
    """Generate a high-entropy ExternalId controlled only by CloudOps."""

    return f"coi_{secrets.token_urlsafe(EXTERNAL_ID_RANDOM_BYTES)}"


def build_assume_role_trust_policy(
    *,
    platform_principal_arn: str,
    external_id: str,
) -> dict[str, object]:
    """Build the customer IAM role trust policy used by CloudOps."""

    if not platform_principal_arn.strip():
        raise ValueError("AWS platform principal ARN is required.")

    if not external_id.strip():
        raise ValueError("AWS ExternalId is required.")

    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudOpsInsightAssumeRole",
                "Effect": "Allow",
                "Principal": {
                    "AWS": platform_principal_arn,
                },
                "Action": "sts:AssumeRole",
                "Condition": {
                    "StringEquals": {
                        "sts:ExternalId": external_id,
                    },
                },
            },
        ],
    }
