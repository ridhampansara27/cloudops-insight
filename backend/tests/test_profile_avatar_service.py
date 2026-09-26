"""Tests for secure profile-avatar normalization."""

from io import BytesIO

import pytest
from PIL import Image

from app.services.profile_avatar_service import (
    MAX_AVATAR_EDGE,
    MAX_AVATAR_UPLOAD_BYTES,
    AvatarProcessingError,
    process_profile_avatar,
)


def _image_bytes(
    *,
    image_format: str,
    size: tuple[int, int] = (
        640,
        360,
    ),
) -> bytes:
    """Build one deterministic in-memory image."""

    image = Image.new(
        "RGB",
        size,
        (
            40,
            120,
            180,
        ),
    )

    output = BytesIO()

    image.save(
        output,
        format=image_format,
    )

    image.close()

    return output.getvalue()


@pytest.mark.parametrize(
    "image_format",
    [
        "JPEG",
        "PNG",
        "WEBP",
    ],
)
def test_supported_avatar_is_reencoded_as_bounded_webp(
    image_format: str,
) -> None:
    """Supported uploads are never persisted in their original form."""

    source = _image_bytes(
        image_format=image_format,
    )

    result = process_profile_avatar(
        source,
    )

    assert result.content_type == "image/webp"

    with Image.open(
        BytesIO(
            result.data,
        ),
    ) as image:
        assert image.format == "WEBP"

        assert image.width <= MAX_AVATAR_EDGE

        assert image.height <= MAX_AVATAR_EDGE


def test_non_image_payload_is_rejected() -> None:
    """Arbitrary file content must never become a stored avatar."""

    with pytest.raises(
        AvatarProcessingError,
    ):
        process_profile_avatar(
            b"this is not an image",
        )


def test_empty_avatar_is_rejected() -> None:
    """Empty multipart content is invalid."""

    with pytest.raises(
        AvatarProcessingError,
    ):
        process_profile_avatar(
            b"",
        )


def test_oversized_avatar_is_rejected_before_decode() -> None:
    """The service independently enforces the raw upload size boundary."""

    with pytest.raises(
        AvatarProcessingError,
    ):
        process_profile_avatar(
            b"x" * (MAX_AVATAR_UPLOAD_BYTES + 1),
        )
