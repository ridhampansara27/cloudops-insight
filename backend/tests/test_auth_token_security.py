"""Security tests for opaque authentication bearer secrets."""

from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
    opaque_token_matches,
)


def test_opaque_auth_tokens_are_random_and_never_stored_raw() -> None:
    first = generate_opaque_token()
    second = generate_opaque_token()

    assert first != second

    # token_urlsafe(48) should provide substantially more than the
    # minimum entropy expected from user-facing one-time secrets.
    assert (
        len(
            first,
        )
        >= 60
    )

    first_hash = hash_opaque_token(
        first,
    )

    assert first_hash != first

    assert (
        len(
            first_hash,
        )
        == 64
    )

    assert (
        hash_opaque_token(
            first,
        )
        == first_hash
    )

    assert opaque_token_matches(
        first,
        first_hash,
    )

    assert not opaque_token_matches(
        second,
        first_hash,
    )
