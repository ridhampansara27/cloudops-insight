# Import iterable typing.
from collections.abc import Iterable

# Import flexible AWS response typing.
from typing import Any


# Convert AWS' list-of-dictionaries tag representation into a dictionary.
def normalize_tags(
    tags: Iterable[dict[str, Any]] | None,
) -> dict[str, str]:
    # Return an empty tag set when AWS supplied nothing.
    if tags is None:
        # Avoid special-case handling in all discovery modules.
        return {}

    # Create the normalized tag dictionary.
    normalized: dict[str, str] = {}

    # Process each provider tag.
    for tag in tags:
        # Read the AWS tag key.
        key = tag.get(
            "Key",
        )

        # Read the AWS tag value.
        value = tag.get(
            "Value",
        )

        # Skip malformed tag values.
        if isinstance(
            key,
            str,
        ) and isinstance(
            value,
            str,
        ):
            # Store the normalized tag.
            normalized[key] = value

    # Return the normalized mapping.
    return normalized


# Find the first matching tag using case-insensitive tag names.
def find_tag(
    tags: dict[str, str],
    *names: str,
) -> str | None:
    # Create a lower-case lookup table.
    lowered_tags = {key.lower(): value for key, value in tags.items()}

    # Search the supported tag names.
    for name in names:
        # Retrieve a matching value.
        value = lowered_tags.get(
            name.lower(),
        )

        # Return the first non-empty result.
        if value:
            return value

    # Report that no matching tag exists.
    return None


# Normalize common environment-tag values.
def normalize_environment(
    tags: dict[str, str],
) -> str | None:
    # Read commonly used environment tag names.
    value = find_tag(
        tags,
        "Environment",
        "Env",
        "Stage",
    )

    # Return no environment when the tag is missing.
    if value is None:
        return None

    # Normalize the tag for comparison.
    normalized = value.strip().lower()

    # Map common development aliases.
    if normalized in {
        "dev",
        "development",
    }:
        return "development"

    # Map common staging aliases.
    if normalized in {
        "stage",
        "staging",
        "test",
        "testing",
    }:
        return "staging"

    # Map common production aliases.
    if normalized in {
        "prod",
        "production",
    }:
        return "production"

    # Preserve unknown environment classifications.
    return normalized


# Extract an ownership value from common organizational tags.
def normalize_owner(
    tags: dict[str, str],
) -> str | None:
    # Search common ownership-tag conventions.
    return find_tag(
        tags,
        "Owner",
        "Team",
        "ManagedBy",
    )
