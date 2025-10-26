#!/bin/bash

# DomuGrauds Full Stack Deployment Script

set -e

echo "🚀 Starting DomuGrauds Full Stack Deployment..."

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
export NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"http://localhost:3001"}
export NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-"http://localhost:3001"}

# Create necessary directories
mkdir -p uploads
mkdir -p ssl

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose down

# Build and start all services
echo "📦 Building Docker images..."
docker-compose build

echo "🔄 Starting all services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."

# Wait for backend
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

# Wait for frontend
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

echo "🎉 Full stack deployment completed successfully!"
echo "🌐 Frontend available at: http://localhost:3000"
echo "📚 API documentation available at: http://localhost:3001/api-docs"
echo "🔌 WebSocket server running on: ws://localhost:3001"
echo ""
echo "📊 Service Status:"
docker-compose ps
