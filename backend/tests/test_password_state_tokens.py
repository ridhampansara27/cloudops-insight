"""Unit tests for password-state-bound access JWTs."""

from datetime import UTC, datetime, timedelta

from app.core.security import (
    access_token_matches_password_state,
    create_access_token,
    decode_access_token_claims,
    password_state_version,
)


def test_access_token_is_bound_to_exact_password_state() -> None:
    changed_at = datetime.now(
        UTC,
    ).replace(
        microsecond=123456,
    )

    version = password_state_version(
        changed_at,
    )

    token = create_access_token(
        "12345678-1234-5678-1234-567812345678",
        password_version=version,
    )

    claims = decode_access_token_claims(
        token,
    )

    assert access_token_matches_password_state(
        claims,
        changed_at,
    )

    later_password = changed_at + timedelta(
        microseconds=1,
    )

    assert not access_token_matches_password_state(
        claims,
        later_password,
    )


def test_legacy_access_token_without_password_state_is_rejected() -> None:
    changed_at = datetime.now(
        UTC,
    )

    token = create_access_token(
        "12345678-1234-5678-1234-567812345678",
    )

    claims = decode_access_token_claims(
        token,
    )

    assert not access_token_matches_password_state(
        claims,
        changed_at,
    )
