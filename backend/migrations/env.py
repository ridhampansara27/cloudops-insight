# Import asyncio so Alembic can execute asynchronous migrations.
import asyncio

# Import Python logging configuration support.
from logging.config import fileConfig

# Import SQLAlchemy's async engine helper.
from sqlalchemy.ext.asyncio import async_engine_from_config

# Import SQLAlchemy's pooling configuration.
from sqlalchemy import pool

# Import Alembic's runtime context.
from alembic import context

# Import application settings.
from app.core.config import settings

# Import every application model so its table is registered in Base.metadata.
import app.models  # noqa: F401

# Import the application's shared SQLAlchemy metadata.
from app.db.base import Base


# Read the Alembic configuration created by alembic.ini.
config = context.config


# Override the generated database URL with the environment-based URL.
config.set_main_option(
    # Replace Alembic's sqlalchemy.url setting.
    "sqlalchemy.url",
    # Use exactly the same database configured for FastAPI.
    settings.database_url,
)


# Configure Alembic logging when configuration is available.
if config.config_file_name is not None:
    # Read logging configuration from alembic.ini.
    fileConfig(
        config.config_file_name,
    )


# Tell Alembic which application metadata should be inspected.
target_metadata = Base.metadata


# Run migrations without establishing a real database connection.
def run_migrations_offline() -> None:
    # Read the configured PostgreSQL URL.
    url = config.get_main_option(
        "sqlalchemy.url",
    )

    # Configure Alembic for offline SQL generation.
    context.configure(
        # Provide the database URL directly.
        url=url,
        # Provide ORM metadata for autogeneration.
        target_metadata=target_metadata,
        # Render named parameters into generated SQL.
        literal_binds=True,
        # Configure named SQL parameter style.
        dialect_opts={
            "paramstyle": "named",
        },
        # Detect SQLAlchemy column-type changes.
        compare_type=True,
    )

    # Start a migration transaction.
    with context.begin_transaction():
        # Execute the configured migration sequence.
        context.run_migrations()


# Execute migrations using an active async connection.
def do_run_migrations(
    # Receive the synchronous wrapper around the async connection.
    connection,
) -> None:
    # Configure Alembic against the active connection.
    context.configure(
        # Provide the database connection.
        connection=connection,
        # Provide SQLAlchemy ORM metadata.
        target_metadata=target_metadata,
        # Detect column-type changes.
        compare_type=True,
    )

    # Start a migration transaction.
    with context.begin_transaction():
        # Execute migrations.
        context.run_migrations()


# Build the async engine and execute migrations.
async def run_async_migrations() -> None:
    # Read Alembic configuration into an async SQLAlchemy engine.
    connectable = async_engine_from_config(
        # Read settings from the Alembic configuration section.
        config.get_section(
            config.config_ini_section,
        ),
        # Read keys beginning with sqlalchemy.
        prefix="sqlalchemy.",
        # Disable normal SQLAlchemy connection pooling for migrations.
        poolclass=pool.NullPool,
    )

    # Open an asynchronous connection.
    async with connectable.connect() as connection:
        # Run Alembic's synchronous migration API through the async connection.
        await connection.run_sync(
            do_run_migrations,
        )

    # Dispose migration-engine connections.
    await connectable.dispose()


# Run migrations using the asynchronous execution path.
def run_migrations_online() -> None:
    # Start the Alembic asyncio event loop.
    asyncio.run(
        run_async_migrations(),
    )


# Decide which migration mode Alembic requested.
if context.is_offline_mode():
    # Generate SQL without connecting to PostgreSQL.
    run_migrations_offline()

else:
    # Run directly against PostgreSQL.
    run_migrations_online()