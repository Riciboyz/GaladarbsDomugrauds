#!/bin/bash
set -e

echo "🚀 Starting DomuGrauds Project..."

# Kill any existing processes
echo "🔄 Cleaning up..."
pkill -f "nodemon" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start Backend
echo "📦 Starting Backend..."
cd /Users/riciboy/GaladarbsDomugrauds/backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend
sleep 5

# Check backend
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend failed - check /tmp/backend.log"
    tail /tmp/backend.log
    exit 1
fi

# Start Frontend
echo "📦 Starting Frontend..."
cd /Users/riciboy/GaladarbsDomugrauds/frontend
PORT=3000 npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend
sleep 8

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend starting (check port 3002 if 3000 is occupied)"
    tail -10 /tmp/frontend.log
fi

echo ""
echo "✅ Both servers are starting!"
echo ""
echo "📍 URLs:"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📊 Check logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🌐 Open browser: http://localhost:3000"

