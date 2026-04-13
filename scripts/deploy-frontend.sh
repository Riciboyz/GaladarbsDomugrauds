#!/bin/bash

# DomuGrauds Frontend Deployment Script

set -e

echo "🚀 Starting DomuGrauds Frontend Deployment..."

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
export NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"http://localhost:3001"}
export NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-"http://localhost:3001"}

# Build and start services
echo "📦 Building Docker images..."
docker-compose build frontend

echo "🔄 Starting frontend service..."
docker-compose up -d frontend

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:3000 &> /dev/null; then
        echo "✅ Frontend is ready!"
        break
    fi
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Frontend failed to start within $timeout seconds"
    docker-compose logs frontend
    exit 1
fi

echo "🎉 Frontend deployment completed successfully!"
echo "🌐 Frontend available at: http://localhost:3000"
