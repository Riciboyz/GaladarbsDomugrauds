#!/bin/bash

# Kill port 3000
echo "Freeing port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Kill all Next.js processes
echo "Killing Next.js processes..."
pkill -f "next dev" 2>/dev/null

sleep 2

# Start frontend on port 3000
echo "Starting frontend on port 3000..."
cd /Users/riciboy/GaladarbsDomugrauds/frontend
PORT=3000 npm run dev

