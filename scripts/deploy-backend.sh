#!/bin/bash

# DomuGrauds Backend Deployment Script

set -e

echo "🚀 Starting DomuGrauds Backend Deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Set environment variables
export NODE_ENV=production
export JWT_SECRET=${JWT_SECRET:-"your-super-secret-jwt-key-change-this-in-production"}

# Create necessary directories
mkdir -p uploads
mkdir -p ssl

# Build and start services
echo "📦 Building Docker images..."
docker-compose build backend

echo "🔄 Starting backend service..."
docker-compose up -d backend

# Wait for backend to be healthy
echo "⏳ Waiting for backend to be healthy..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:3001/health &> /dev/null; then
        echo "✅ Backend is healthy!"
        break
    fi
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Backend failed to start within $timeout seconds"
    docker-compose logs backend
    exit 1
fi

echo "🎉 Backend deployment completed successfully!"
echo "📚 API documentation available at: http://localhost:3001/api-docs"
echo "🔌 WebSocket server running on: ws://localhost:3001"
