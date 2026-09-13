"""Deliver authentication emails without exposing bearer secrets."""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from functools import partial
from typing import Protocol
from urllib.parse import urlencode

from anyio import to_thread

from app.core.config import settings

logger = logging.getLogger(
    __name__,
)


class VerificationEmailSender(Protocol):
    """Interface used by registration tests and production SMTP delivery."""

    async def send_verification_email(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        """Deliver one verification link."""


class VerificationEmailConfigurationError(RuntimeError):
    """Raised when production email delivery is not configured."""


class AuthEmailService:
    """Send CloudOps authentication mail through configured SMTP."""

    @property
    def is_configured(
        self,
    ) -> bool:
        """Return whether an SMTP host and sender are configured."""

        return bool(settings.smtp_host.strip() and settings.smtp_from_email.strip())

    async def send_verification_email(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        """Deliver a verification link without logging the raw token."""

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
            f"{settings.frontend_base_url.rstrip('/')}/verify-email?{query}"
        )

        message = EmailMessage()

        message["Subject"] = "Verify your CloudOps Insight email"

        message["From"] = settings.smtp_from_email

        message["To"] = recipient

        message.set_content(
            f"""Welcome to CloudOps Insight.

Verify your email address using this link:
{verification_url}

If you did not request this account, you can ignore this email.
""",
        )

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
        """Execute blocking SMTP I/O outside FastAPI's event loop."""

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
                # The message operation has already completed or failed.
                # Do not replace the original result with a quit failure.
                pass
