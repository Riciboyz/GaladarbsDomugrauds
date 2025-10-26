#!/bin/bash

cd /Users/riciboy/GaladarbsDomugrauds

# Kill old processes
echo "Cleaning up..."
pkill -f "nodemon" 2>/dev/null; pkill -f "next dev" 2>/dev/null
sleep 2

# Start backend
echo "Starting backend..."
cd backend && npm run dev &
cd ..

# Wait for backend
sleep 5

# Check backend
curl -s http://localhost:3001/health && echo " ✅ Backend OK" || echo " ❌ Backend FAILED"

# Start frontend
echo "Starting frontend..."
cd frontend && PORT=3000 npm run dev &
cd ..

# Wait for frontend
sleep 10

echo ""
echo "✅ Servers started!"
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Open: http://localhost:3000"

