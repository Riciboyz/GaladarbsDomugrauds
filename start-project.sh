#!/bin/bash

set -euo pipefail

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "${FRONTEND_PID:-}" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
}

trap cleanup EXIT INT TERM

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

wait_for_health() {
  local url="$1"
  local name="$2"
  local max_attempts="$3"
  local attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    if curl -fsS "$url" > /dev/null 2>&1; then
      echo "✅ $name is running on $url"
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  echo "❌ $name failed to start ($url did not become healthy in ${max_attempts}s)"
  return 1
}

# Check if backend is running
wait_for_health "http://localhost:3001/health" "Backend" 30

# Start Frontend (polling on macOS avoids EMFILE → broken HMR / 500 on /_next chunks)
echo "📦 Starting Frontend Server..."
cd ../frontend
if [ "$(uname -s)" = "Darwin" ]; then
  export NEXT_DEV_POLL=1
fi
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Basic check that frontend is reachable
wait_for_health "http://localhost:3000" "Frontend" 45

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

