# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─── Runtime Stage ────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Security: run as non-root user
RUN groupadd -r sentinel && useradd -r -g sentinel sentinel

WORKDIR /app

# Runtime OS dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p uploads/images uploads/videos uploads/documents logs && \
    chown -R sentinel:sentinel /app

# Switch to non-root user
USER sentinel

# Expose port (default 8000 for local container runs)
EXPOSE 8000

# Health check using dynamic PORT environment variable provided by platform
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start command: bind to host 0.0.0.0 and dynamic $PORT provided by Render
CMD ["sh", "-c", "PORT=${PORT:-8000}; exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1 --loop asyncio --access-log"]
