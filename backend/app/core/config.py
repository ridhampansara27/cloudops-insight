# Import a cache decorator so settings are constructed only once.
from functools import lru_cache
from urllib.parse import urlsplit

from email_validator import EmailNotValidError, validate_email

# Import Pydantic's field-validation helper.
from pydantic import field_validator, model_validator

# Import the Pydantic settings base class and configuration helper.
from pydantic_settings import BaseSettings, SettingsConfigDict


# Define all environment-driven application settings.
class Settings(BaseSettings):
    # Configure how application settings are loaded.
    model_config = SettingsConfigDict(
        # Load development values from the local .env file.
        env_file=".env",
        # Read the environment file using UTF-8.
        env_file_encoding="utf-8",
        # Treat environment-variable names case-insensitively.
        case_sensitive=False,
        # Ignore unrelated environment variables.
        extra="ignore",
    )

    # Define the visible FastAPI application name.
    app_name: str = "CloudOps Insight API"

    # Define the lifecycle deployment environment.
    #
    # This is deliberately semantic rather than infrastructure-specific:
    # Kubernetes is a platform, not an application environment.
    app_env: str = "development"

    # Identify which application process is constructing shared settings.
    #
    # API requires the complete browser/authentication/email production
    # contract. Background and migration processes receive only the secrets
    # they genuinely need.
    app_component: str = "api"

    # Enable development diagnostics.
    debug: bool = True

    # Define the version-one API prefix.
    api_v1_prefix: str = "/api/v1"

    # Define frontend origins permitted by CORS.
    cors_origins: str = "http://localhost:5173"

    # Define the asynchronous PostgreSQL connection.
    database_url: str

    # Define the Redis connection.
    redis_url: str

    # Enable distributed abuse protection for public authentication
    # and workspace-invitation actions.
    rate_limit_enabled: bool = True

    # Trust Cloudflare's canonical connecting-IP header only when the
    # application origin is protected behind Cloudflare/Tunnel.
    #
    # Keep disabled for local development and for any deployment where
    # clients can reach the application origin directly.
    rate_limit_trust_cloudflare_connecting_ip: bool = False

    # Define application logging verbosity.
    log_level: str = "INFO"

    # Control SQLAlchemy SQL logging.
    sql_echo: bool = False

    # Define the secret used to sign JWT tokens.
    jwt_secret: str

    # Define the JWT signing algorithm.
    jwt_algorithm: str = "HS256"

    # Define access-token lifetime in minutes.
    access_token_expire_minutes: int = 30

    # Define the initial development administrator email address.
    seed_admin_email: str = "admin@example.com"

    # Define the initial administrator's display name.
    seed_admin_name: str = "CloudOps Administrator"

    # Define the development administrator password.
    seed_admin_password: str = ""

    # Define the AWS IAM principal customers must trust.
    # Production must configure this to the CloudOps platform
    # IAM user or role used to call sts:AssumeRole.
    aws_platform_principal_arn: str | None = None

    # Keep public commercial registration fail-closed until
    # production email/session configuration is intentionally enabled.
    public_signup_enabled: bool = False

    # Base browser URL used to construct email-verification links.
    frontend_base_url: str = "http://localhost:5173"

    # SMTP delivery configuration.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "no-reply@cloudops-insight.local"

    # Destination for authenticated customer support tickets.
    support_recipient_email: str = "support@cloudopsinsight.tech"

    # Human-readable sender name shown by email clients.
    smtp_from_name: str = "CloudOps Insight"
    smtp_starttls: bool = True
    smtp_timeout_seconds: int = 10

    # Prevent immediate verification-email spam.
    verification_resend_cooldown_seconds: int = 60

    # Optional dedicated HMAC secret for opaque auth tokens.
    #
    # Until deployment configuration supplies a dedicated value,
    # security helpers fall back to JWT_SECRET. Production readiness
    # later requires a distinct AUTH_TOKEN_PEPPER secret.
    auth_token_pepper: str = ""

    # Lifetime of an email-verification link.
    email_verification_token_expire_minutes: int = 1440

    # Lifetime of a password-reset link.
    password_reset_token_expire_minutes: int = 30

    # Prevent repeated password-reset email spam.
    password_reset_resend_cooldown_seconds: int = 60
    workspace_invitation_expire_hours: int = 168

    # Maximum lifetime of one refresh-session family.
    refresh_session_expire_days: int = 30

    # Rotating refresh bearer cookie.
    #
    # Secure defaults to true so production fails toward the safer mode.
    # Local HTTP development may explicitly override this with:
    # REFRESH_COOKIE_SECURE=false
    refresh_cookie_name: str = "cloudops_refresh"
    refresh_cookie_secure: bool = True
    refresh_cookie_samesite: str = "lax"
    refresh_cookie_path: str = "/api/v1/auth"
    refresh_cookie_domain: str = ""

    # Define the AWS region used for STS and default AWS clients.
    aws_default_region: str = "eu-central-1"

    # Define an optional local AWS profile.
    aws_profile_name: str | None = None

    # Define the STS AssumeRole session name.
    aws_role_session_name: str = "cloudops-insight"

    # Define the lifetime of temporary assumed-role credentials.
    aws_role_duration_seconds: int = 3600

    # Define Celery's Redis message broker.
    celery_broker_url: str = "redis://localhost:6379/1"

    # Define Celery's task-result backend.
    celery_result_backend: str = "redis://localhost:6379/2"

    @field_validator(
        "app_env",
        mode="before",
    )
    @classmethod
    def validate_app_environment(
        cls,
        value: object,
    ) -> object:
        """Normalize and restrict lifecycle environment names."""

        if not isinstance(
            value,
            str,
        ):
            return value

        normalized = value.strip().lower()

        allowed = {
            "development",
            "test",
            "staging",
            "production",
        }

        if normalized not in allowed:
            raise ValueError(
                "APP_ENV must be one of: development, test, staging, production."
            )

        return normalized

    @field_validator(
        "app_component",
        mode="before",
    )
    @classmethod
    def validate_app_component(
        cls,
        value: object,
    ) -> object:
        """Normalize and restrict application process identities."""

        if not isinstance(
            value,
            str,
        ):
            return value

        normalized = value.strip().lower()

        allowed = {
            "api",
            "worker",
            "beat",
            "migration",
        }

        if normalized not in allowed:
            raise ValueError(
                "APP_COMPONENT must be one of: api, worker, beat, migration."
            )

        return normalized

    @model_validator(
        mode="after",
    )
    def validate_production_readiness(
        self,
    ) -> "Settings":
        """Reject unsafe configuration when APP_ENV is production."""

        if not self.is_production:
            return self

        problems: list[str] = []

        def require(
            condition: bool,
            message: str,
        ) -> None:
            if not condition:
                problems.append(
                    message,
                )

        def looks_placeholder(
            value: str,
        ) -> bool:
            normalized = value.strip().lower()

            placeholder_markers = (
                "change-me",
                "changeme",
                "replace-with",
                "development-secret",
                "dev-secret",
                "ci-only",
                "not-production",
                "example-secret",
            )

            return any(marker in normalized for marker in placeholder_markers)

        # ----------------------------------------------------
        # Runtime diagnostics
        # ----------------------------------------------------

        require(
            not self.debug,
            "DEBUG must be false in production.",
        )

        # ----------------------------------------------------
        # Component boundary
        # ----------------------------------------------------

        # Celery and Alembic construct the same Settings object but they
        # do not serve browser authentication or send authentication mail.
        #
        # Do not distribute SMTP credentials or opaque-token pepper to
        # processes that do not use them.
        if self.app_component != "api":
            if problems:
                raise ValueError(
                    "Unsafe production configuration: "
                    + " ".join(
                        problems,
                    ),
                )

            return self

        # ----------------------------------------------------
        # Authentication secrets
        # ----------------------------------------------------

        jwt_secret = self.jwt_secret.strip()

        token_pepper = self.auth_token_pepper.strip()

        require(
            len(
                jwt_secret,
            )
            >= 32,
            "JWT_SECRET must contain at least 32 characters in production.",
        )

        require(
            not looks_placeholder(
                jwt_secret,
            ),
            "JWT_SECRET must not use a placeholder value in production.",
        )

        require(
            len(
                token_pepper,
            )
            >= 32,
            "AUTH_TOKEN_PEPPER must contain at least 32 characters in production.",
        )

        require(
            not looks_placeholder(
                token_pepper,
            ),
            "AUTH_TOKEN_PEPPER must not use a placeholder value in production.",
        )

        require(
            bool(
                token_pepper,
            )
            and token_pepper != jwt_secret,
            "AUTH_TOKEN_PEPPER must be independent from JWT_SECRET.",
        )

        # ----------------------------------------------------
        # Public frontend URL
        # ----------------------------------------------------

        frontend_url = urlsplit(
            self.frontend_base_url.strip(),
        )

        frontend_host = (frontend_url.hostname or "").lower()

        require(
            frontend_url.scheme == "https",
            "FRONTEND_BASE_URL must use HTTPS in production.",
        )

        require(
            bool(
                frontend_host,
            ),
            "FRONTEND_BASE_URL must contain a hostname in production.",
        )

        require(
            frontend_host
            not in {
                "localhost",
                "127.0.0.1",
                "::1",
            },
            "FRONTEND_BASE_URL must not target localhost in production.",
        )

        require(
            frontend_url.username is None and frontend_url.password is None,
            "FRONTEND_BASE_URL must not contain credentials.",
        )

        require(
            frontend_url.query == "" and frontend_url.fragment == "",
            "FRONTEND_BASE_URL must not contain a query or fragment.",
        )

        require(
            frontend_url.path
            in {
                "",
                "/",
            },
            "FRONTEND_BASE_URL must point to the application origin.",
        )

        # ----------------------------------------------------
        # CORS
        # ----------------------------------------------------

        cors_origins = self.cors_origin_list

        require(
            bool(
                cors_origins,
            ),
            "At least one production CORS origin is required.",
        )

        for origin in cors_origins:
            parsed_origin = urlsplit(
                origin,
            )

            origin_host = (parsed_origin.hostname or "").lower()

            if (
                parsed_origin.scheme != "https"
                or not origin_host
                or origin_host
                in {
                    "localhost",
                    "127.0.0.1",
                    "::1",
                }
                or parsed_origin.username is not None
                or parsed_origin.password is not None
                or parsed_origin.query
                or parsed_origin.fragment
                or parsed_origin.path
                not in {
                    "",
                    "/",
                }
            ):
                problems.append(
                    "Every CORS origin must be an HTTPS origin without "
                    "credentials, path, query or fragment in production.",
                )

                break

        require(
            "*" not in cors_origins,
            "Wildcard CORS origins are forbidden in production.",
        )

        # ----------------------------------------------------
        # SMTP transport
        # ----------------------------------------------------

        smtp_host = self.smtp_host.strip()

        smtp_username = self.smtp_username.strip()

        smtp_password = self.smtp_password.strip()

        smtp_from_email = self.smtp_from_email.strip()

        support_recipient_email = (
            self.support_recipient_email.strip()
        )

        require(
            bool(
                smtp_host,
            ),
            "SMTP_HOST is required in production.",
        )

        require(
            1 <= self.smtp_port <= 65535,
            "SMTP_PORT must be a valid TCP port.",
        )

        require(
            bool(
                smtp_username,
            ),
            "SMTP_USERNAME is required in production.",
        )

        require(
            bool(
                smtp_password,
            ),
            "SMTP_PASSWORD is required in production.",
        )

        require(
            not looks_placeholder(
                smtp_password,
            ),
            "SMTP_PASSWORD must not use a placeholder value in production.",
        )

        require(
            self.smtp_starttls,
            "SMTP_STARTTLS must be enabled in production.",
        )

        require(
            1 <= self.smtp_timeout_seconds <= 60,
            "SMTP_TIMEOUT_SECONDS must be between 1 and 60 seconds.",
        )

        try:
            validated_sender = validate_email(
                smtp_from_email,
                check_deliverability=False,
            )

            sender_domain = validated_sender.domain.lower()

            reserved_domains = {
                "example.com",
                "example.net",
                "example.org",
                "localhost",
            }

            require(
                sender_domain not in reserved_domains
                and not sender_domain.endswith(
                    (
                        ".local",
                        ".invalid",
                        ".example",
                        ".test",
                    ),
                ),
                "SMTP_FROM_EMAIL must use a real production sender domain.",
            )

        except EmailNotValidError:
            problems.append(
                "SMTP_FROM_EMAIL must be a valid email address.",
            )

        try:
            validated_support_recipient = validate_email(
                support_recipient_email,
                check_deliverability=False,
            )

            support_domain = (
                validated_support_recipient.domain.lower()
            )

            reserved_support_domains = {
                "example.com",
                "example.net",
                "example.org",
                "localhost",
            }

            require(
                support_domain not in reserved_support_domains
                and not support_domain.endswith(
                    (
                        ".local",
                        ".invalid",
                        ".example",
                        ".test",
                    ),
                ),
                (
                    "SUPPORT_RECIPIENT_EMAIL must use a real "
                    "production email domain."
                ),
            )

        except EmailNotValidError:
            problems.append(
                "SUPPORT_RECIPIENT_EMAIL must be a valid email address.",
            )

        # ----------------------------------------------------
        # Refresh-session cookie
        # ----------------------------------------------------

        require(
            self.refresh_cookie_secure,
            "REFRESH_COOKIE_SECURE must be true in production.",
        )

        require(
            self.refresh_cookie_domain.strip() == "",
            "REFRESH_COOKIE_DOMAIN must remain empty for a host-only production cookie.",
        )

        require(
            self.refresh_cookie_path == "/api/v1/auth",
            "REFRESH_COOKIE_PATH must remain scoped to /api/v1/auth.",
        )

        # ----------------------------------------------------
        # Distributed abuse protection
        # ----------------------------------------------------

        require(
            self.rate_limit_enabled,
            "RATE_LIMIT_ENABLED must be true in production.",
        )

        if problems:
            raise ValueError(
                "Unsafe production configuration: "
                + " ".join(
                    problems,
                ),
            )

        return self

    # Report whether the application is running in production.
    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    # Convert comma-separated CORS origins into a Python list.
    @property
    def cors_origin_list(self) -> list[str]:
        # Split the configured origins by comma.
        origins = self.cors_origins.split(",")

        # Remove whitespace and empty values.
        return [origin.strip() for origin in origins if origin.strip()]

    # Normalize an empty AWS profile value into None.
    @field_validator(
        "aws_profile_name",
        mode="before",
    )
    @classmethod
    def normalize_aws_profile(
        cls,
        value: object,
    ) -> object:
        # Convert an empty environment-variable string into None.
        if value == "":
            # Allow Boto3 to use its normal credential-provider chain.
            return None

        # Preserve any explicitly configured profile name.
        return value


# Cache settings so the application uses one shared instance.
@lru_cache
def get_settings() -> Settings:
    # Construct and validate application settings.
    return Settings()


# Export the shared settings object.
settings = get_settings()
