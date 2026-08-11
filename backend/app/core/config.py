# Import a cache decorator so settings are constructed only once.
from functools import lru_cache

# Import the Pydantic base settings class.
# Import Pydantic's settings-configuration helper.
from pydantic_settings import BaseSettings, SettingsConfigDict


# Define all environment-driven application settings.
class Settings(BaseSettings):
    # Configure how Pydantic loads environment variables.
    model_config = SettingsConfigDict(
        # Load development variables from backend/.env.
        env_file=".env",
        # Read the environment file using UTF-8.
        env_file_encoding="utf-8",
        # Treat environment-variable names without case sensitivity.
        case_sensitive=False,
        # Ignore unrelated environment variables.
        extra="ignore",
    )

    # Define the human-readable API name.
    app_name: str = "CloudOps Insight API"

    # Define the current runtime environment.
    app_env: str = "development"

    # Define whether debug behavior is enabled.
    debug: bool = True

    # Define the prefix used by version-one API routes.
    api_v1_prefix: str = "/api/v1"

    # Define comma-separated frontend origins permitted by CORS.
    cors_origins: str = "http://localhost:5173"

    # Define the asynchronous PostgreSQL connection URL.
    database_url: str

    # Define the Redis connection URL.
    redis_url: str

    # Define application logging verbosity.
    log_level: str = "INFO"

    # Define whether SQLAlchemy should print SQL statements.
    sql_echo: bool = False

    # Convert the comma-separated CORS configuration into a Python list.
    @property
    def cors_origin_list(self) -> list[str]:
        # Split each configured origin by comma.
        origins = self.cors_origins.split(",")

        # Remove whitespace and discard empty entries.
        return [origin.strip() for origin in origins if origin.strip()]


# Cache the Settings object so every import shares the same instance.
@lru_cache
def get_settings() -> Settings:
    # Construct and validate the application settings.
    return Settings()


# Create the shared application settings instance.
settings = get_settings()
