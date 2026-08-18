# syntax=docker/dockerfile:1

# ------------------------------------------------------------
# Stage 1: React production build
# ------------------------------------------------------------

# Use Node only for the frontend build.
FROM node:22-alpine AS builder

# Define frontend source directory.
WORKDIR /app

# Copy npm dependency metadata first.
COPY package.json package-lock.json ./

# Install exactly the versions from package-lock.json.
RUN npm ci

# Copy frontend source code.
COPY . .

# Allow build-time API URL configuration.
#
# Empty means "same browser origin".
ARG VITE_API_BASE_URL=""

# Expose the value to Vite during npm run build.
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Create the optimized frontend bundle.
RUN npm run build


# ------------------------------------------------------------
# Stage 2: NGINX runtime
# ------------------------------------------------------------

# Use a small NGINX runtime.
FROM nginx:alpine AS runtime

# Remove the default NGINX website configuration.
RUN rm \
    /etc/nginx/conf.d/default.conf

# Copy our global NGINX configuration.
COPY nginx/nginx.conf \
    /etc/nginx/nginx.conf

# Copy the CloudOps site configuration.
COPY nginx/default.conf \
    /etc/nginx/conf.d/default.conf

# Copy only the compiled Vite application.
COPY --from=builder \
    /app/dist \
    /usr/share/nginx/html

# Prepare writable runtime directories for the non-root nginx user.
RUN mkdir -p \
        /tmp/nginx \
        /tmp/client_temp \
        /tmp/proxy_temp \
        /tmp/fastcgi_temp \
        /tmp/uwsgi_temp \
        /tmp/scgi_temp \
    && chown -R \
        nginx:nginx \
        /tmp/nginx \
        /tmp/client_temp \
        /tmp/proxy_temp \
        /tmp/fastcgi_temp \
        /tmp/uwsgi_temp \
        /tmp/scgi_temp \
        /usr/share/nginx/html

# Drop root privileges.
USER nginx

# Use an unprivileged application port.
EXPOSE 8080

# Verify that NGINX itself remains reachable.
HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=3 \
    CMD wget -q -O - http://127.0.0.1:8080/healthz || exit 1

# Keep NGINX in the foreground.
CMD ["nginx", "-g", "daemon off;"]