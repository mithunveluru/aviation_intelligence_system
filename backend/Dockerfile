FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    gcc g++ build-essential curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --timeout 1000 --retries 10 \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org \
    -r requirements.txt

ARG CACHE_BUST=1
COPY . .
RUN mkdir -p /app/data
COPY data/aviation.db /app/data/aviation.db

EXPOSE 10000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1 --no-access-log
