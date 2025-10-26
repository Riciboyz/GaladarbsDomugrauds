#!/bin/bash

# Start backend
echo "🚀 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend
sleep 5

# Start frontend
echo "🚀 Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servers starting..."
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

wait

