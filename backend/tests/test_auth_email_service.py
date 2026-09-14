"""SMTP transport and authentication-email integration tests."""

import smtplib
import socketserver
import ssl
from collections.abc import Iterator
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from threading import Thread
from typing import cast

import pytest

from app.core.config import settings
from app.services import auth_email_service
from app.services.auth_email_service import AuthEmailService


class CaptureSMTPServer(
    socketserver.ThreadingTCPServer,
):
    """Tiny deterministic SMTP server used only by the test suite."""

    allow_reuse_address = True

    daemon_threads = True

    messages: list[bytes]


class CaptureSMTPHandler(
    socketserver.StreamRequestHandler,
):
    """Implement the minimum SMTP protocol required by smtplib."""

    server: CaptureSMTPServer

    def _reply(
        self,
        line: bytes,
    ) -> None:
        self.wfile.write(
            line + b"\r\n",
        )

        self.wfile.flush()

    def handle(
        self,
    ) -> None:
        self._reply(
            b"220 localhost CloudOps SMTP test server",
        )

        data_mode = False

        data_lines: list[bytes] = []

        while True:
            line = self.rfile.readline()

            if not line:
                return

            if data_mode:
                if line == b".\r\n":
                    self.server.messages.append(
                        b"".join(
                            data_lines,
                        ),
                    )

                    data_lines.clear()

                    data_mode = False

                    self._reply(
                        b"250 2.0.0 message accepted",
                    )

                    continue

                # SMTP dot-stuffing escapes a data line beginning with ".".
                if line.startswith(
                    b"..",
                ):
                    line = line[1:]

                data_lines.append(
                    line,
                )

                continue

            command = line.decode(
                "utf-8",
                errors="replace",
            ).strip()

            upper = command.upper()

            if upper.startswith(
                "EHLO ",
            ):
                self._reply(
                    b"250-localhost",
                )

                self._reply(
                    b"250 SIZE 10485760",
                )

            elif upper.startswith(
                "HELO ",
            ):
                self._reply(
                    b"250 localhost",
                )

            elif upper.startswith(
                "MAIL FROM:",
            ):
                self._reply(
                    b"250 2.1.0 sender accepted",
                )

            elif upper.startswith(
                "RCPT TO:",
            ):
                self._reply(
                    b"250 2.1.5 recipient accepted",
                )

            elif upper == "DATA":
                data_mode = True

                self._reply(
                    b"354 End data with <CR><LF>.<CR><LF>",
                )

            elif upper == "RSET":
                data_lines.clear()

                data_mode = False

                self._reply(
                    b"250 2.0.0 reset",
                )

            elif upper == "NOOP":
                self._reply(
                    b"250 2.0.0 ok",
                )

            elif upper == "QUIT":
                self._reply(
                    b"221 2.0.0 bye",
                )

                return

            else:
                self._reply(
                    b"250 2.0.0 ok",
                )


@pytest.fixture
def smtp_capture_server() -> Iterator[CaptureSMTPServer]:
    """Run a real local TCP SMTP capture server."""

    server = CaptureSMTPServer(
        (
            "127.0.0.1",
            0,
        ),
        CaptureSMTPHandler,
    )

    server.messages = []

    thread = Thread(
        target=server.serve_forever,
        daemon=True,
    )

    thread.start()

    try:
        yield server

    finally:
        server.shutdown()

        server.server_close()

        thread.join(
            timeout=5,
        )


def _configure_local_smtp(
    monkeypatch: pytest.MonkeyPatch,
    server: CaptureSMTPServer,
) -> None:
    """Point AuthEmailService at the local SMTP capture server."""

    host, port = server.server_address

    monkeypatch.setattr(
        settings,
        "smtp_host",
        str(
            host,
        ),
    )

    monkeypatch.setattr(
        settings,
        "smtp_port",
        int(
            port,
        ),
    )

    monkeypatch.setattr(
        settings,
        "smtp_username",
        "",
    )

    monkeypatch.setattr(
        settings,
        "smtp_password",
        "",
    )

    monkeypatch.setattr(
        settings,
        "smtp_from_email",
        "no-reply@cloudops.example",
    )

    monkeypatch.setattr(
        settings,
        "smtp_starttls",
        False,
    )

    monkeypatch.setattr(
        settings,
        "smtp_timeout_seconds",
        5,
    )

    monkeypatch.setattr(
        settings,
        "frontend_base_url",
        "https://cloudinsight.example",
    )


def _parse_message(
    raw_message: bytes,
) -> EmailMessage:
    """Parse one SMTP DATA payload into an EmailMessage."""

    parsed = BytesParser(
        policy=policy.default,
    ).parsebytes(
        raw_message,
    )

    return cast(
        EmailMessage,
        parsed,
    )


def _plain_text(
    message: EmailMessage,
) -> str:
    """Return decoded plain-text message content."""

    body = message.get_body(
        preferencelist=("plain",),
    )

    if body is None:
        raise AssertionError(
            "Expected a text/plain email body.",
        )

    content = body.get_content()

    if not isinstance(
        content,
        str,
    ):
        raise TypeError(
            "Expected decoded string email content.",
        )

    return content


@pytest.mark.asyncio
async def test_real_smtp_delivers_all_commercial_auth_emails(
    monkeypatch: pytest.MonkeyPatch,
    smtp_capture_server: CaptureSMTPServer,
) -> None:
    """Exercise actual smtplib TCP delivery for all bearer emails."""

    _configure_local_smtp(
        monkeypatch,
        smtp_capture_server,
    )

    service = AuthEmailService()

    verification_token = "verify-token+special/value_123"

    reset_token = "reset-token+special/value_456"

    invitation_token = "invite-token+special/value_789"

    await service.send_verification_email(
        recipient="owner@example.com",
        token=verification_token,
    )

    await service.send_password_reset_email(
        recipient="owner@example.com",
        token=reset_token,
    )

    await service.send_workspace_invitation(
        recipient_email="member@example.com",
        token=invitation_token,
        organization_name="Cloud Platform",
        role="member",
        inviter_name="Platform Owner",
    )

    assert (
        len(
            smtp_capture_server.messages,
        )
        == 3
    )

    verification = _parse_message(
        smtp_capture_server.messages[0],
    )

    reset = _parse_message(
        smtp_capture_server.messages[1],
    )

    invitation = _parse_message(
        smtp_capture_server.messages[2],
    )

    # --------------------------------------------------------
    # Verification email
    # --------------------------------------------------------

    assert verification["From"] == "no-reply@cloudops.example"

    assert verification["To"] == "owner@example.com"

    assert verification["Subject"] == "Verify your CloudOps Insight email"

    verification_body = _plain_text(
        verification,
    )

    assert (
        "https://cloudinsight.example/"
        "verify-email#"
        "token=verify-token%2Bspecial%2Fvalue_123" in verification_body
    )

    assert "?token=" not in verification_body

    # --------------------------------------------------------
    # Password reset
    # --------------------------------------------------------

    assert reset["From"] == "no-reply@cloudops.example"

    assert reset["To"] == "owner@example.com"

    assert reset["Subject"] == "Reset your CloudOps Insight password"

    reset_body = _plain_text(
        reset,
    )

    assert (
        "https://cloudinsight.example/"
        "reset-password#"
        "token=reset-token%2Bspecial%2Fvalue_456" in reset_body
    )

    assert "?token=" not in reset_body

    # --------------------------------------------------------
    # Workspace invitation
    # --------------------------------------------------------

    assert invitation["From"] == "no-reply@cloudops.example"

    assert invitation["To"] == "member@example.com"

    assert invitation["Subject"] == (
        "You are invited to Cloud Platform on CloudOps Insight"
    )

    invitation_body = _plain_text(
        invitation,
    )

    assert "Platform Owner invited you to join Cloud Platform" in invitation_body

    assert "Workspace role: member" in invitation_body

    assert (
        "https://cloudinsight.example/"
        "invitations/accept#"
        "token=invite-token%2Bspecial%2Fvalue_789" in invitation_body
    )

    assert "?token=" not in invitation_body


class FakeSMTP:
    """Capture the production SMTP call sequence."""

    last_instance: "FakeSMTP | None" = None

    def __init__(
        self,
        *,
        host: str,
        port: int,
        timeout: int,
    ) -> None:
        self.host = host

        self.port = port

        self.timeout = timeout

        self.starttls_context: ssl.SSLContext | None = None

        self.login_credentials: (
            tuple[
                str,
                str,
            ]
            | None
        ) = None

        self.sent_message: EmailMessage | None = None

        self.quit_called = False

        FakeSMTP.last_instance = self

    def starttls(
        self,
        *,
        context: ssl.SSLContext,
    ) -> tuple[
        int,
        bytes,
    ]:
        self.starttls_context = context

        return (
            220,
            b"ready for TLS",
        )

    def login(
        self,
        username: str,
        password: str,
    ) -> tuple[
        int,
        bytes,
    ]:
        self.login_credentials = (
            username,
            password,
        )

        return (
            235,
            b"authenticated",
        )

    def send_message(
        self,
        message: EmailMessage,
    ) -> dict[str, tuple[int, bytes]]:
        self.sent_message = message

        return {}

    def quit(
        self,
    ) -> tuple[
        int,
        bytes,
    ]:
        self.quit_called = True

        return (
            221,
            b"bye",
        )


def test_production_smtp_path_uses_tls_auth_and_cleanup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """STARTTLS and authentication occur before production delivery."""

    monkeypatch.setattr(
        settings,
        "smtp_host",
        "smtp.provider.example",
    )

    monkeypatch.setattr(
        settings,
        "smtp_port",
        587,
    )

    monkeypatch.setattr(
        settings,
        "smtp_username",
        "cloudops-user",
    )

    monkeypatch.setattr(
        settings,
        "smtp_password",
        "provider-generated-password",
    )

    monkeypatch.setattr(
        settings,
        "smtp_starttls",
        True,
    )

    monkeypatch.setattr(
        settings,
        "smtp_timeout_seconds",
        10,
    )

    monkeypatch.setattr(
        auth_email_service.smtplib,
        "SMTP",
        FakeSMTP,
    )

    message = EmailMessage()

    message["From"] = "no-reply@cloudops.example"

    message["To"] = "recipient@example.com"

    message["Subject"] = "Transport test"

    message.set_content(
        "Transport test.",
    )

    AuthEmailService._send_message(
        message,
    )

    smtp = FakeSMTP.last_instance

    assert smtp is not None

    assert smtp.host == "smtp.provider.example"

    assert smtp.port == 587

    assert smtp.timeout == 10

    assert isinstance(
        smtp.starttls_context,
        ssl.SSLContext,
    )

    assert smtp.starttls_context.verify_mode == ssl.CERT_REQUIRED

    assert smtp.starttls_context.check_hostname is True

    assert smtp.login_credentials == (
        "cloudops-user",
        "provider-generated-password",
    )

    assert smtp.sent_message is message

    assert smtp.quit_called is True


class FailingSMTP(
    FakeSMTP,
):
    """Simulate a provider failure after connection/authentication."""

    def send_message(
        self,
        message: EmailMessage,
    ) -> dict[str, tuple[int, bytes]]:
        del message

        raise smtplib.SMTPDataError(
            451,
            b"temporary provider failure",
        )


def test_smtp_failure_still_closes_connection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """SMTP resources are closed even when delivery fails."""

    monkeypatch.setattr(
        settings,
        "smtp_host",
        "smtp.provider.example",
    )

    monkeypatch.setattr(
        settings,
        "smtp_port",
        587,
    )

    monkeypatch.setattr(
        settings,
        "smtp_username",
        "cloudops-user",
    )

    monkeypatch.setattr(
        settings,
        "smtp_password",
        "provider-generated-password",
    )

    monkeypatch.setattr(
        settings,
        "smtp_starttls",
        True,
    )

    monkeypatch.setattr(
        settings,
        "smtp_timeout_seconds",
        10,
    )

    monkeypatch.setattr(
        auth_email_service.smtplib,
        "SMTP",
        FailingSMTP,
    )

    message = EmailMessage()

    message["From"] = "no-reply@cloudops.example"

    message["To"] = "recipient@example.com"

    message["Subject"] = "Failure transport test"

    message.set_content(
        "Failure transport test.",
    )

    with pytest.raises(
        smtplib.SMTPDataError,
    ):
        AuthEmailService._send_message(
            message,
        )

    smtp = FakeSMTP.last_instance

    assert smtp is not None

    assert smtp.quit_called is True
