"""Validated support-ticket API contracts."""

from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

SupportCategory = Literal[
    "access",
    "aws_onboarding",
    "billing",
    "bug",
    "security",
    "other",
]


class SupportTicketCreate(
    BaseModel,
):
    """Authenticated customer support request."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    category: SupportCategory

    subject: str = Field(
        min_length=5,
        max_length=160,
    )

    message: str = Field(
        min_length=10,
        max_length=4000,
    )

    @field_validator(
        "subject",
    )
    @classmethod
    def validate_subject(
        cls,
        value: str,
    ) -> str:
        """Keep user input safe for use in an email Subject header."""

        if any(
            character in value
            for character in (
                "\r",
                "\n",
                "\x00",
            )
        ):
            raise ValueError(
                "Subject must be a single line.",
            )

        return value

    @field_validator(
        "message",
    )
    @classmethod
    def validate_message(
        cls,
        value: str,
    ) -> str:
        """Reject NUL while preserving normal multiline ticket text."""

        if "\x00" in value:
            raise ValueError(
                "Message contains an unsupported control character.",
            )

        return value


class SupportTicketResponse(
    BaseModel,
):
    """Safe support-ticket acknowledgement."""

    ticket_id: str

    submitted_at: datetime
