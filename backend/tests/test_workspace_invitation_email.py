"""Tests for secure workspace-invitation email delivery."""

from email.message import EmailMessage

import pytest

from app.core.config import settings
from app.services.auth_email_service import AuthEmailService


@pytest.mark.asyncio
async def test_workspace_invitation_email_uses_fragment_bearer(
    monkeypatch,
) -> None:
    """Invitation bearer must live in the URL fragment, not query."""

    captured: list[EmailMessage] = []

    async def capture_message(
        message: EmailMessage,
    ) -> None:
        captured.append(
            message,
        )

    monkeypatch.setattr(
        settings,
        "smtp_host",
        "smtp.test.invalid",
    )

    monkeypatch.setattr(
        settings,
        "smtp_from_email",
        "no-reply@example.com",
    )

    monkeypatch.setattr(
        settings,
        "frontend_base_url",
        "https://app.example.com",
    )

    service = AuthEmailService()

    monkeypatch.setattr(
        service,
        "_send_async",
        capture_message,
    )

    token = "invitation-token-with-special+characters/1234567890"

    await service.send_workspace_invitation(
        recipient_email="member@example.com",
        token=token,
        organization_name="Cloud Platform",
        role="member",
        inviter_name="Workspace Owner",
    )

    assert (
        len(
            captured,
        )
        == 1
    )

    message = captured[0]

    assert message["To"] == "member@example.com"

    assert "Cloud Platform" in str(
        message["Subject"],
    )

    body = message.get_content()

    assert "https://app.example.com/invitations/accept#token=" in body

    assert "/invitations/accept?token=" not in body

    assert "Workspace Owner" in body

    assert "Workspace role: member" in body
