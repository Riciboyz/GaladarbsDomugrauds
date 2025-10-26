#!/bin/bash

# Test script for DomuGrauds Backend

echo "🧪 Testing DomuGrauds Backend..."

# Test backend health
echo "Testing backend health endpoint..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    echo "Make sure the backend is running on port 3001"
    exit 1
fi

# Test API documentation
echo "Testing API documentation..."
if curl -f http://localhost:3001/api-docs > /dev/null 2>&1; then
    echo "✅ API documentation accessible"
else
    echo "❌ API documentation not accessible"
fi

# Test WebSocket connection
echo "Testing WebSocket connection..."
if nc -z localhost 3001 > /dev/null 2>&1; then
    echo "✅ WebSocket port is open"
else
    echo "❌ WebSocket port is not accessible"
fi

echo "🎉 Backend tests completed!"
echo ""
echo "📚 API Documentation: http://localhost:3001/api-docs"
echo "🔌 WebSocket Server: ws://localhost:3001"
echo "💚 Health Check: http://localhost:3001/health"
