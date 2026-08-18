# Import Python's standard logging package.
import logging

# Import application settings.
from app.core.config import settings


# Configure logging for the FastAPI application.
def configure_logging() -> None:
    # Convert the configured logging level into a logging constant.
    log_level = getattr(
        logging,
        settings.log_level.upper(),
        logging.INFO,
    )

    # Configure the application's root logger.
    logging.basicConfig(
        # Apply the configured logging level.
        level=log_level,
        # Include timestamp, level, logger name, and message.
        format=("%(asctime)s %(levelname)s %(name)s %(message)s"),
    )
