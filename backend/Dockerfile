FROM python:3.12-slim

# ── Install system dependencies ─────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Set Python environment ───────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100

WORKDIR /app

# ── Install dependencies ─────────────────────────────────────────────────────
COPY requirements.txt .

# 🔥 Force CPU-only torch BEFORE installing requirements
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu

# Then install everything else normally
RUN pip install --no-cache-dir --timeout 1000 --retries 10 \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org \
    -r requirements.txt

# ── Copy app ─────────────────────────────────────────────────────────────────
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
