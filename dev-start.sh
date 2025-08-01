#!/bin/bash

# Development startup script for the entire Social Media app
# This script starts both frontend and backend in development mode

set -e

echo "🚀 Starting Social Media Development Environment..."
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the project root directory"
    echo "   Expected: frontend/ and backend/ directories"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

echo "🔧 Starting Backend Server..."
cd backend/go
./run-backend.sh &
BACKEND_PID=$!
cd ../..

# Wait a moment for backend to start
sleep 3

echo ""
echo "🎨 Starting Frontend Development Server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development Environment Ready!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend:  http://localhost:8080"
echo ""
echo "📱 Open http://localhost:3000 in your browser to start using the app"
echo ""
echo "🛑 Press Ctrl+C to stop all servers"
echo ""

# Wait for user to stop the script
wait
