"""Deliver authentication emails without exposing bearer secrets."""

import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from email.utils import formataddr
from functools import partial
from html import escape
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


def _html_text(
    value: str,
) -> str:
    """Escape untrusted email content and preserve line breaks."""

    return escape(
        value,
    ).replace(
        "\n",
        "<br />",
    )


def _branded_email_html(
    *,
    eyebrow: str,
    title: str,
    paragraphs: tuple[str, ...],
    action_label: str | None = None,
    action_url: str | None = None,
    details: tuple[tuple[str, str], ...] = (),
    security_note: str | None = None,
) -> str:
    """Render a reusable CloudOps Insight transactional-email shell."""

    frontend_url = settings.frontend_base_url.rstrip("/")

    logo_url = f"{frontend_url}/cloudops-mark.svg"

    paragraph_html = "".join(
        (
            '<p style="margin:0 0 16px;'
            "font-size:15px;line-height:1.7;"
            'color:#b8c4d6;">'
            f"{_html_text(paragraph)}"
            "</p>"
        )
        for paragraph in paragraphs
    )

    details_html = ""

    if details:
        rows = "".join(
            (
                "<tr>"
                '<td style="padding:7px 12px 7px 0;'
                "font-size:12px;line-height:1.5;"
                "font-weight:600;color:#718096;"
                'vertical-align:top;white-space:nowrap;">'
                f"{escape(label)}"
                "</td>"
                '<td style="padding:7px 0;'
                "font-size:13px;line-height:1.5;"
                "color:#dbe7f5;vertical-align:top;"
                'word-break:break-word;">'
                f"{_html_text(value)}"
                "</td>"
                "</tr>"
            )
            for label, value in details
        )

        details_html = (
            '<table role="presentation" width="100%" '
            'cellspacing="0" cellpadding="0" '
            'style="margin:8px 0 22px;'
            "border-collapse:collapse;"
            "border-top:1px solid #263548;"
            'border-bottom:1px solid #263548;">'
            f"{rows}"
            "</table>"
        )

    action_html = ""

    if action_label is not None and action_url is not None:
        action_html = (
            '<table role="presentation" cellspacing="0" '
            'cellpadding="0" style="margin:26px 0;">'
            "<tr><td>"
            f'<a href="{escape(action_url, quote=True)}" '
            'style="display:inline-block;'
            "padding:12px 20px;border-radius:10px;"
            "background:#22d3ee;color:#07111f;"
            "font-size:14px;font-weight:700;"
            'text-decoration:none;">'
            f"{escape(action_label)}"
            "</a>"
            "</td></tr></table>"
        )

    security_html = ""

    if security_note:
        security_html = (
            '<div style="margin-top:24px;'
            "padding:13px 15px;"
            "border:1px solid #334155;"
            'border-radius:10px;background:#0c1726;">'
            '<p style="margin:0;font-size:12px;'
            'line-height:1.6;color:#8391a5;">'
            f"{_html_text(security_note)}"
            "</p></div>"
        )

    return f"""<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#050b14;color:#e5edf7;">
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="width:100%;background:#050b14;padding:30px 12px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="width:100%;max-width:620px;background:#0a1422;border:1px solid #233247;border-radius:18px;overflow:hidden;"
          >
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #233247;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:middle;">
                      <img
                        src="{escape(logo_url, quote=True)}"
                        width="44"
                        height="44"
                        alt="CloudOps Insight"
                        style="display:block;width:44px;height:44px;border:0;border-radius:12px;"
                      />
                    </td>

                    <td style="vertical-align:middle;">
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#f2f7fc;">
                        CloudOps Insight
                      </div>

                      <div style="margin-top:3px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#67e8f9;">
                        AWS operations + FinOps
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 28px;font-family:Arial,Helvetica,sans-serif;">
                <div style="margin-bottom:10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#67e8f9;">
                  {escape(eyebrow)}
                </div>

                <h1 style="margin:0 0 18px;font-size:25px;line-height:1.25;color:#f7fbff;">
                  {escape(title)}
                </h1>

                {paragraph_html}
                {details_html}
                {action_html}
                {security_html}
              </td>
            </tr>

            <tr>
              <td style="padding:18px 28px;border-top:1px solid #233247;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0;font-size:11px;line-height:1.6;color:#64748b;">
                  CloudOps Insight &middot;
                  <a
                    href="{escape(frontend_url, quote=True)}"
                    style="color:#94a3b8;text-decoration:none;"
                  >cloudopsinsight.tech</a>
                  &middot;
                  <a
                    href="mailto:support@cloudopsinsight.tech"
                    style="color:#94a3b8;text-decoration:none;"
                  >support@cloudopsinsight.tech</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


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

        message.add_alternative(
            _branded_email_html(
                eyebrow="Email verification",
                title="Verify your CloudOps Insight email",
                paragraphs=(
                    "Welcome to CloudOps Insight.",
                    ("Confirm your email address to finish setting up your account."),
                ),
                action_label="Verify email",
                action_url=verification_url,
                security_note=(
                    "If you did not request this account, you can ignore this email."
                ),
            ),
            subtype="html",
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

        message.add_alternative(
            _branded_email_html(
                eyebrow="Account security",
                title="Reset your CloudOps Insight password",
                paragraphs=(
                    (
                        "A password reset was requested for your "
                        "CloudOps Insight account."
                    ),
                    "Use the secure link below to choose a new password.",
                ),
                action_label="Reset password",
                action_url=reset_url,
                security_note=(
                    "This link expires automatically and can only "
                    "be used once. If you did not request a password "
                    "reset, you can ignore this email."
                ),
            ),
            subtype="html",
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

        message.add_alternative(
            _branded_email_html(
                eyebrow="Workspace invitation",
                title=f"Join {organization_name} on CloudOps Insight",
                paragraphs=(
                    (f"{inviter_name} invited you to join {organization_name}."),
                ),
                action_label="Accept invitation",
                action_url=invitation_url,
                details=(
                    ("Workspace", organization_name),
                    ("Role", role),
                    ("Invited by", inviter_name),
                ),
                security_note=(
                    "This invitation expires automatically and can only "
                    "be used once. If you were not expecting this "
                    "invitation, you can ignore this email."
                ),
            ),
            subtype="html",
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

        message.add_alternative(
            _branded_email_html(
                eyebrow="Customer support",
                title=subject,
                paragraphs=(support_message,),
                details=(
                    ("Ticket ID", ticket_id),
                    ("Category", category),
                    ("Submitted", submitted_at.isoformat()),
                    ("Customer", user_name),
                    ("Customer email", user_email),
                    ("Account ID", user_id),
                    ("Workspace", organization_name),
                    ("Workspace ID", organization_id),
                    ("Role", organization_role),
                ),
                security_note=(
                    "CloudOps Insight support requests must not contain "
                    "passwords, AWS secret keys, session tokens, "
                    "or other credentials."
                ),
            ),
            subtype="html",
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
