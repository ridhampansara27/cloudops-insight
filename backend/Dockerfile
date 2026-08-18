# syntax=docker/dockerfile:1

# ------------------------------------------------------------
# Stage 1: Python dependency builder
# ------------------------------------------------------------

# Use the same Python major/minor version as the local project.
FROM python:3.13-slim AS builder

# Prevent Python from creating .pyc cache files.
ENV PYTHONDONTWRITEBYTECODE=1

# Disable Python's stdout buffering.
ENV PYTHONUNBUFFERED=1

# Keep Poetry's virtual environment inside the project directory.
ENV POETRY_VIRTUALENVS_IN_PROJECT=true

# Disable interactive Poetry prompts.
ENV POETRY_NO_INTERACTION=1

# Define the application working directory.
WORKDIR /app

# Install Poetry only in the build stage.
RUN pip install \
    --no-cache-dir \
    poetry

# Copy dependency metadata first so Docker can cache dependency installation.
COPY pyproject.toml poetry.lock ./

# Install production dependencies only.
#
# package-mode=false is already configured in this project,
# so CloudOps Insight itself does not need to be installed as a package.
RUN poetry install \
    --only main \
    --no-root


# ------------------------------------------------------------
# Stage 2: Production runtime
# ------------------------------------------------------------

# Start again from a clean Python image.
FROM python:3.13-slim AS runtime

# Prevent Python byte-code files.
ENV PYTHONDONTWRITEBYTECODE=1

# Ensure logs are written immediately.
ENV PYTHONUNBUFFERED=1

# Put the Poetry-created virtual environment on PATH.
ENV PATH="/app/.venv/bin:${PATH}"

# Define application directory.
WORKDIR /app

# Install the latest available Debian security/package updates
# in the final runtime image, then remove the APT package lists
# so they do not unnecessarily increase the image size.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Create a dedicated non-root Linux user.
RUN groupadd \
        --gid 10001 \
        cloudops \
    && useradd \
        --uid 10001 \
        --gid cloudops \
        --create-home \
        cloudops

# Copy the production Python environment from the builder.
COPY --from=builder \
    /app/.venv \
    /app/.venv

# pip is required only while building the Python environment.
# Remove it from the final runtime image to reduce unnecessary
# tooling and attack surface in production.
RUN /usr/local/bin/python -m pip uninstall --yes pip \
    && /app/.venv/bin/python -m pip uninstall --yes pip

# Copy the FastAPI application.
COPY app ./app

# Copy Alembic configuration and migrations.
COPY alembic.ini ./
COPY migrations ./migrations

# Keep operational scripts such as seed_admin available.
COPY scripts ./scripts

# Give the application files to the non-root runtime user.
RUN chown \
    -R \
    cloudops:cloudops \
    /app

# Drop root privileges.
USER cloudops

# Document the FastAPI port.
EXPOSE 8000

# Add a low-cost container health check.
#
# This uses Python's standard library so curl does not need
# to be installed in the production image.
HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=15s \
    --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/live', timeout=3)" || exit 1

# Start one Uvicorn process.
#
# Kubernetes will later scale the number of Pods rather
# than running many worker processes inside one container.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]