"""Support-ticket email composition tests."""

from datetime import (
    UTC,
    datetime,
)
from email.message import EmailMessage

import pytest

from app.core.config import settings
from app.services.auth_email_service import AuthEmailService


@pytest.mark.asyncio
async def test_support_ticket_email_contains_authenticated_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Support email contains ticket/customer/workspace context."""

    monkeypatch.setattr(
        settings,
        "smtp_host",
        "smtp.example.internal",
    )

    monkeypatch.setattr(
        settings,
        "smtp_from_email",
        "no-reply@cloudopsinsight.tech",
    )

    monkeypatch.setattr(
        settings,
        "smtp_from_name",
        "CloudOps Insight",
    )

    monkeypatch.setattr(
        settings,
        "support_recipient_email",
        "support@cloudopsinsight.tech",
    )

    captured: dict[
        str,
        EmailMessage,
    ] = {}

    async def capture(
        message: EmailMessage,
    ) -> None:
        captured["message"] = message

    service = AuthEmailService()

    monkeypatch.setattr(
        service,
        "_send_async",
        capture,
    )

    submitted_at = datetime(
        2026,
        9,
        25,
        21,
        30,
        tzinfo=UTC,
    )

    await service.send_support_ticket(
        ticket_id="SUP-20260925-ABC12345",
        category="bug",
        subject="Resources page issue",
        support_message="Resource pagination text is incorrect.",
        user_name="CloudOps Administrator",
        user_email="owner@example.com",
        user_id="11111111-1111-1111-1111-111111111111",
        organization_name="Production AWS",
        organization_id="22222222-2222-2222-2222-222222222222",
        organization_role="owner",
        submitted_at=submitted_at,
    )

    message = captured["message"]

    assert message["To"] == "support@cloudopsinsight.tech"

    assert message["Reply-To"] == "owner@example.com"

    assert message["Subject"] == (
        "[CloudOps Support] SUP-20260925-ABC12345 - Resources page issue"
    )

    body = message.get_content()

    assert "SUP-20260925-ABC12345" in body

    assert "Category: bug" in body

    assert "CloudOps Administrator" in body

    assert "owner@example.com" in body

    assert "Account ID: 11111111-1111-1111-1111-111111111111" in body

    assert "Production AWS" in body

    assert "Workspace ID: 22222222-2222-2222-2222-222222222222" in body

    assert "Role: owner" in body

    assert "Resource pagination text is incorrect." in body
