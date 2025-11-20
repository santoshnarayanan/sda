# ===========================
#   Smart Developer Assistant
#   Backend Dockerfile
# ===========================

FROM python:3.10-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y gcc python3-dev build-essential && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy pyproject + lock files first for caching
COPY pyproject.toml ./
COPY . .

RUN pip install --upgrade pip
RUN pip install .

ENV PYTHONUNBUFFERED=1

# Let Cloud Run define the port (default 8080)
ENV PORT=8080
EXPOSE 8080

# Start using Cloud Run's assigned port
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]

