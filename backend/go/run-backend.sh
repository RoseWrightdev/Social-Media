#!/bin/bash

# Simple script to run the backend with proper environment setup
# Usage: ./run-backend.sh

set -e

echo "Starting Social Media Backend..."

# Navigate to the Go backend directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo ".env file not found! Please create .env file with Auth0 configuration."
    exit 1
fi

# Show environment info
echo "Working directory: $(pwd)"
echo "Loading environment from .env file..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Go is not installed or not in PATH"
    exit 1
fi

echo "Go version: $(go version)"

# Check if main.go exists
if [ ! -f "cmd/v1/session/main.go" ]; then
    echo "main.go not found at cmd/v1/session/main.go"
    exit 1
fi

# Show what we're about to run
echo "Running: go run cmd/v1/session/main.go"
echo "Server will be available at: http://localhost:8080"
echo "WebSocket endpoints:"
echo "   - ws://localhost:8080/ws/zoom/:roomId"
echo "   - ws://localhost:8080/ws/chat/:roomId"
echo "   - ws://localhost:8080/ws/screenshare/:roomId"

# Run the server
go run cmd/v1/session/main.go
