FROM python:3.12-slim

WORKDIR /app

# Install system-level dependencies needed by some packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libssl-dev \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --upgrade pip

# Install CPU-only torch first (avoids downloading the full 2GB CUDA build)
RUN pip install torch --extra-index-url https://download.pytorch.org/whl/cpu

# Install remaining requirements
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Create a non-root user and grant ownership so logs/audit files can be written
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose the port Render will bind to
EXPOSE 8000

# Uvicorn in production mode (single worker, async)
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000} --loop uvloop --http httptools
