# Dockerfile for Face Attendance System on Render
# Using Python 3.11-slim for better vision library compatibility
FROM python:3.11-slim

# Environment variables to optimize Python performance
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies required for dlib and opencv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to /app
WORKDIR /app

# Upgrade pip and build tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install dlib in its own layer (pre-compilation phase)
# This optimizes build time and clarifies memory usage
RUN pip install --no-cache-dir dlib==19.24.1

# Copy the rest of the backend requirements and install them
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend source code
COPY backend /app/backend

# Copy .env file if it exists (Render environment variables will still override this)
COPY .env* /app/

# The port will be provided by Render as an environment variable
ENV PORT=10000

# Run the application with Gunicorn using Uvicorn workers
# We use 1 worker to keep RAM usage low (dlib models are heavy)
CMD gunicorn -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT} backend.main:app
