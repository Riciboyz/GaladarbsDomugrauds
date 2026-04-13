#!/bin/bash

echo "Testing DomuGrauds Backend..."

echo "Testing backend health endpoint..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "  Backend health check passed"
else
    echo "  Backend health check failed"
    echo "Make sure the backend is running on port 3001"
    exit 1
fi

echo "Testing WebSocket connection..."
if nc -z localhost 3001 > /dev/null 2>&1; then
    echo "  WebSocket port is open"
else
    echo "  WebSocket port is not accessible"
fi

echo "Backend tests completed!"
echo ""
echo "Health Check: http://localhost:3001/health"
echo "WebSocket:    ws://localhost:3001"
