# Import a cache decorator so settings are constructed only once.
from functools import lru_cache

# Import Pydantic's field-validation helper.
from pydantic import field_validator

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

    # Define the current deployment environment.
    app_env: str = "development"

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
