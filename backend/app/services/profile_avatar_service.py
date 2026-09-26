"""Secure profile-avatar image normalization."""

import warnings
from dataclasses import dataclass
from io import BytesIO

from PIL import (
    Image,
    ImageOps,
    UnidentifiedImageError,
)

# Accept normal camera/image uploads without allowing large request bodies.
MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024

# Prevent image decompression bombs from expanding a small compressed upload
# into an unreasonable amount of memory.
MAX_AVATAR_PIXELS = 20_000_000

# Store only a compact profile representation.
MAX_AVATAR_EDGE = 256

# The persisted representation is intentionally bounded as a second defense.
MAX_AVATAR_STORED_BYTES = 512 * 1024

# Only formats that are appropriate for ordinary profile photography.
ALLOWED_SOURCE_FORMATS = {
    "JPEG",
    "PNG",
    "WEBP",
}

# Apply the global Pillow decompression threshold before any image is opened.
Image.MAX_IMAGE_PIXELS = MAX_AVATAR_PIXELS


class AvatarProcessingError(
    ValueError,
):
    """Raised when an uploaded profile image cannot be accepted."""


@dataclass(
    frozen=True,
    slots=True,
)
class ProcessedAvatar:
    """Sanitized avatar ready for persistence."""

    data: bytes

    content_type: str = "image/webp"


def process_profile_avatar(
    payload: bytes,
) -> ProcessedAvatar:
    """Validate and normalize one untrusted image upload.

    The original file is never returned or persisted. Accepted input is fully
    decoded by Pillow, EXIF orientation is applied, metadata is discarded,
    dimensions are bounded, and the result is encoded as a single WebP image.
    """

    if not payload:
        raise AvatarProcessingError(
            "The uploaded profile image is empty.",
        )

    if len(payload) > MAX_AVATAR_UPLOAD_BYTES:
        raise AvatarProcessingError(
            "The profile image exceeds the 5 MB upload limit.",
        )

    try:
        with warnings.catch_warnings():
            warnings.simplefilter(
                "error",
                Image.DecompressionBombWarning,
            )

            with Image.open(
                BytesIO(
                    payload,
                ),
            ) as source:
                source_format = (source.format or "").upper()

                if source_format not in ALLOWED_SOURCE_FORMATS:
                    raise AvatarProcessingError(
                        "Use a JPEG, PNG or WebP profile image.",
                    )

                if (
                    getattr(
                        source,
                        "n_frames",
                        1,
                    )
                    != 1
                ):
                    raise AvatarProcessingError(
                        "Animated profile images are not supported.",
                    )

                # Force the decoder to process the image while all security
                # limits and exception handling are active.
                source.load()

                # Honor camera orientation before resizing.
                oriented = ImageOps.exif_transpose(
                    source,
                )

                has_alpha = oriented.mode in {
                    "RGBA",
                    "LA",
                } or (oriented.mode == "P" and "transparency" in oriented.info)

                normalized = oriented.convert(
                    "RGBA" if has_alpha else "RGB",
                )

                normalized.thumbnail(
                    (
                        MAX_AVATAR_EDGE,
                        MAX_AVATAR_EDGE,
                    ),
                    Image.Resampling.LANCZOS,
                )

                output = BytesIO()

                # Re-encoding strips untrusted source metadata and guarantees
                # one known response media type.
                normalized.save(
                    output,
                    format="WEBP",
                    quality=82,
                    method=6,
                )

                normalized.close()

    except AvatarProcessingError:
        raise

    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as error:
        raise AvatarProcessingError(
            "The uploaded file is not a valid supported profile image.",
        ) from error

    result = output.getvalue()

    if not result or len(result) > MAX_AVATAR_STORED_BYTES:
        raise AvatarProcessingError(
            "The profile image could not be normalized safely.",
        )

    return ProcessedAvatar(
        data=result,
    )
