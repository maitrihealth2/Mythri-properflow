FROM python:3.12-slim

WORKDIR /app

# Install system-level dependencies needed by native packages (libsndfile1, ffmpeg, build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    libsndfile1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first for Docker layer caching
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create application user and necessary runtime directories
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/.cache/huggingface /app/data /app/knowledge && \
    chown -R appuser:appuser /app

# Copy application code
COPY . .

# Ensure appuser owns all copied files and writable paths
RUN chown -R appuser:appuser /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/app/.cache/huggingface \
    PORT=8000

USER appuser

# Expose default port
EXPOSE 8000

# Run uvicorn using exec shell form to support dynamic platform PORT env variables (e.g. Render, Railway, Cloud Run)
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
