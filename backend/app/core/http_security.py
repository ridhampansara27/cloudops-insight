"""HTTP response hardening for the CloudOps API."""

from starlette.datastructures import MutableHeaders
from starlette.types import (
    ASGIApp,
    Message,
    Receive,
    Scope,
    Send,
)


class SecurityHeadersMiddleware:
    """Apply defense-in-depth headers to HTTP responses."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        api_prefix: str,
    ) -> None:
        self.app = app

        # Normalize the API prefix once so route comparisons remain
        # predictable even if configuration contains a trailing slash.
        self.api_prefix = api_prefix.rstrip("/") + "/"

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        """Attach headers without buffering or rewriting response bodies."""

        if scope["type"] != "http":
            await self.app(
                scope,
                receive,
                send,
            )

            return

        path = scope.get(
            "path",
            "",
        )

        async def send_with_security_headers(
            message: Message,
        ) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(
                    scope=message,
                )

                # Prevent MIME-type inference.
                headers["X-Content-Type-Options"] = "nosniff"

                # API responses should never be rendered in another site's
                # frame, including error responses.
                headers["X-Frame-Options"] = "DENY"

                # API URLs should not leak through browser referrers.
                headers["Referrer-Policy"] = "no-referrer"

                # API responses do not require access to powerful browser
                # capabilities.
                headers["Permissions-Policy"] = (
                    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
                )

                # Disable legacy cross-domain policy discovery.
                headers["X-Permitted-Cross-Domain-Policies"] = "none"

                # The frontend intentionally performs application-level
                # caching through TanStack Query. Browser/proxy HTTP caches
                # must not retain tenant or authentication API payloads.
                if path.startswith(
                    self.api_prefix,
                ):
                    headers["Cache-Control"] = "no-store"

                    headers["Pragma"] = "no-cache"

            await send(
                message,
            )

        await self.app(
            scope,
            receive,
            send_with_security_headers,
        )
