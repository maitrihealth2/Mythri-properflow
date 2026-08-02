FROM python:3.12-slim

WORKDIR /app


COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY . .

# Use Gunicorn as the process manager to balance load across multiple Uvicorn workers natively
CMD gunicorn app:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120
