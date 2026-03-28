# Dockerfile for Face Attendance System on Render (Lightweight OpenCV version)
FROM python:3.11-slim

# Environment variables to optimize Python performance
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install minimal system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to /app
WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Copy and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create models directory and download YuNet/SFace models
RUN mkdir -p /app/backend/models && \
    curl -L https://github.com/opencv/opencv_zoo/raw/master/models/face_detection_yunet/face_detection_yunet_2023mar.onnx -o /app/backend/models/yunet.onnx && \
    curl -L https://github.com/opencv/opencv_zoo/raw/master/models/face_recognition_sface/face_recognition_sface_2021dec.onnx -o /app/backend/models/sface.onnx

# Copy the entire backend source code
COPY backend /app/backend

# Copy .env file if it exists
COPY .env* /app/

# The port will be provided by Render
ENV PORT=10000

# Run the application with Gunicorn
# Multi-worker is now possible because OpenCV is lighter than dlib,
# but we'll stick to 1-2 workers to stay safe on free tier.
CMD gunicorn -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT} backend.main:app
