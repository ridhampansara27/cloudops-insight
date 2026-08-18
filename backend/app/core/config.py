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
