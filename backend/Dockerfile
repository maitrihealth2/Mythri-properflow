# ==========================
# Base Image
# ==========================
FROM python:3.12-slim

# ==========================
# Environment
# ==========================
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# ==========================
# System Dependencies
# ==========================
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    curl \
    ffmpeg \
    libsndfile1 \
    git \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ==========================
# Upgrade pip
# ==========================
RUN python -m pip install --upgrade pip setuptools wheel

# ==========================
# Install PyTorch CPU
# (Remove torch from requirements.txt)
# ==========================
RUN pip install \
    torch \
    torchvision \
    torchaudio \
    --index-url https://download.pytorch.org/whl/cpu

# ==========================
# Install Python Dependencies
# ==========================
COPY requirements.txt .

RUN pip install \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# ==========================
# Download NLTK Data
# ==========================
RUN python - <<EOF
import nltk
nltk.download("punkt")
nltk.download("punkt_tab")
EOF

# ==========================
# Copy Project
# ==========================
COPY . .

# ==========================
# Create Non-root User
# ==========================
RUN useradd -m appuser
USER appuser

EXPOSE 8000

# ==========================
# Start Server
# ==========================
CMD ["gunicorn", "app:app", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keep-alive", "30", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
