"""Deliver authentication emails without exposing bearer secrets."""

import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from email.utils import formataddr
from functools import partial
from typing import Protocol
from urllib.parse import urlencode

from anyio import to_thread

from app.core.config import settings


class VerificationEmailSender(Protocol):
    """Interface for verification-email delivery."""

    async def send_verification_email(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        """Deliver one verification link."""


class PasswordResetEmailSender(Protocol):
    """Interface for password-reset email delivery."""

    async def send_password_reset_email(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        """Deliver one password-reset link."""


class VerificationEmailConfigurationError(RuntimeError):
    """Raised when authentication SMTP delivery is unavailable."""


class SupportEmailDeliveryError(RuntimeError):
    """Raised when a support ticket cannot be delivered."""


class AuthEmailService:
    """Send CloudOps authentication mail through configured SMTP."""

    @property
    def is_configured(
        self,
    ) -> bool:
        """Return whether required SMTP delivery settings exist."""

        return bool(settings.smtp_host.strip() and settings.smtp_from_email.strip())

    async def send_verification_email(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        """Deliver an email-verification link."""

        if not self.is_configured:
            raise VerificationEmailConfigurationError(
                "Authentication email delivery is not configured.",
            )

        query = urlencode(
            {
                "token": token,
            },
        )

        verification_url = (
            f"{settings.frontend_base_url.rstrip('/')}/verify-email#{query}"
        )

        message = EmailMessage()

        message["Subject"] = "Verify your CloudOps Insight email"

        message["From"] = formataddr(
            (
                settings.smtp_from_name.strip(),
                settings.smtp_from_email.strip(),
            ),
        )

        message["To"] = recipient

        message.set_content(
            f"""Welcome to CloudOps Insight.

Verify your email address using this link:
{verification_url}

If you did not request this account, you can ignore this email.
""",
        )

        await self._send_async(
            message,
        )

    async def send_password_reset_email(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        """Deliver an expiring one-time password-reset link."""

        if not self.is_configured:
            raise VerificationEmailConfigurationError(
                "Authentication email delivery is not configured.",
            )

        query = urlencode(
            {
                "token": token,
            },
        )

        reset_url = f"{settings.frontend_base_url.rstrip('/')}/reset-password#{query}"

        message = EmailMessage()

        message["Subject"] = "Reset your CloudOps Insight password"

        message["From"] = formataddr(
            (
                settings.smtp_from_name.strip(),
                settings.smtp_from_email.strip(),
            ),
        )

        message["To"] = recipient

        message.set_content(
            f"""A password reset was requested for your CloudOps Insight account.

Set a new password using this link:
{reset_url}

This link expires automatically and can only be used once.

If you did not request a password reset, you can ignore this email.
""",
        )

        await self._send_async(
            message,
        )

    async def send_workspace_invitation(
        self,
        *,
        recipient_email: str,
        token: str,
        organization_name: str,
        role: str,
        inviter_name: str,
    ) -> None:
        """Deliver one expiring organization-invitation link."""

        if not self.is_configured:
            raise VerificationEmailConfigurationError(
                "Authentication email delivery is not configured.",
            )

        query = urlencode(
            {
                "token": token,
            },
        )

        invitation_url = (
            f"{settings.frontend_base_url.rstrip('/')}/invitations/accept#{query}"
        )

        message = EmailMessage()

        message["Subject"] = (
            f"You are invited to {organization_name} on CloudOps Insight"
        )

        message["From"] = formataddr(
            (
                settings.smtp_from_name.strip(),
                settings.smtp_from_email.strip(),
            ),
        )

        message["To"] = recipient_email

        message.set_content(
            f"""{inviter_name} invited you to join {organization_name} on CloudOps Insight.

Workspace role: {role}

Accept the invitation using this secure link:
{invitation_url}

This invitation expires automatically and can only be used once.

If you were not expecting this invitation, you can ignore this email.
""",
        )

        await self._send_async(
            message,
        )

    async def send_support_ticket(
        self,
        *,
        ticket_id: str,
        category: str,
        subject: str,
        support_message: str,
        user_name: str,
        user_email: str,
        user_id: str,
        organization_name: str,
        organization_id: str,
        organization_role: str,
        submitted_at: datetime,
    ) -> None:
        """Deliver one authenticated customer support request."""

        if not self.is_configured or not settings.support_recipient_email.strip():
            raise VerificationEmailConfigurationError(
                "Support email delivery is not configured.",
            )

        message = EmailMessage()

        message["Subject"] = f"[CloudOps Support] {ticket_id} - {subject}"

        message["From"] = formataddr(
            (
                settings.smtp_from_name.strip(),
                settings.smtp_from_email.strip(),
            ),
        )

        message["To"] = settings.support_recipient_email.strip()

        # Make normal email-client Reply actions reach the customer.
        message["Reply-To"] = user_email

        message.set_content(
            f"""CloudOps Insight support ticket

Ticket ID: {ticket_id}
Category: {category}
Subject: {subject}
Submitted: {submitted_at.isoformat()}

Message:
{support_message}

Authenticated customer
----------------------
Name: {user_name}
Email: {user_email}
Account ID: {user_id}

Workspace
---------
Name: {organization_name}
Workspace ID: {organization_id}
Role: {organization_role}

Security note:
CloudOps Insight support requests must not contain passwords,
AWS secret keys, session tokens, or other credentials.
""",
        )

        try:
            await self._send_async(
                message,
            )

        except (
            OSError,
            smtplib.SMTPException,
        ) as error:
            raise SupportEmailDeliveryError(
                "Support email delivery failed.",
            ) from error

    async def _send_async(
        self,
        message: EmailMessage,
    ) -> None:
        """Run blocking SMTP communication outside the async event loop."""

        operation = partial(
            self._send_message,
            message,
        )

        await to_thread.run_sync(
            operation,
        )

    @staticmethod
    def _send_message(
        message: EmailMessage,
    ) -> None:
        """Send one prepared SMTP message."""

        smtp = smtplib.SMTP(
            host=settings.smtp_host,
            port=settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
        )

        try:
            if settings.smtp_starttls:
                smtp.starttls(
                    context=ssl.create_default_context(),
                )

            if settings.smtp_username:
                smtp.login(
                    settings.smtp_username,
                    settings.smtp_password,
                )

            smtp.send_message(
                message,
            )

        finally:
            try:
                smtp.quit()

            except smtplib.SMTPException:
                pass
