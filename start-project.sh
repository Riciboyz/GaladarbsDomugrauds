#!/bin/bash

echo "🚀 Starting DomuGrauds Project..."
echo ""

# Kill any existing processes
echo "🔄 Cleaning up old processes..."
pkill -f "nodemon" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# Start Backend
echo "📦 Starting Backend Server..."
cd backend
npm run dev &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 5

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:3001"
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start Frontend
echo "📦 Starting Frontend Server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Both servers are starting!"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "⚠️  Wait 10-15 seconds for both servers to fully start"
echo ""
echo "To stop servers, run: pkill -f 'nodemon|next dev'"

wait

