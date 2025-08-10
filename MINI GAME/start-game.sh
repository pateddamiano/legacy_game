#!/bin/bash

echo "========================================"
echo "  FIRST OFF - Brooklyn Street Mini Game"
echo "========================================"
echo ""
echo "Starting local game server..."
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to start Node.js server
start_node_server() {
    echo "Node.js detected! Starting Node.js server..."
    echo ""
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
        echo ""
    fi
    
    echo "Starting game server on http://localhost:8080"
    echo "Press Ctrl+C to stop the server"
    echo ""
    npm start
}

# Function to start Python server
start_python_server() {
    local python_cmd=$1
    echo "$python_cmd detected! Starting Python server..."
    echo ""
    echo "Starting game server on http://localhost:8080"
    echo "Press Ctrl+C to stop the server"
    echo ""
    $python_cmd python_server.py
}

# Function to show error and alternatives
show_error() {
    echo "========================================"
    echo "   ERROR: No compatible server found"
    echo "========================================"
    echo ""
    echo "Please install one of the following:"
    echo ""
    echo "1. Node.js (Recommended)"
    echo "   Ubuntu/Debian: sudo apt install nodejs npm"
    echo "   macOS: brew install node"
    echo "   Or download from: https://nodejs.org"
    echo ""
    echo "2. Python 3.6+"
    echo "   Ubuntu/Debian: sudo apt install python3"
    echo "   macOS: brew install python3"
    echo "   Or download from: https://python.org"
    echo ""
    echo "Alternatively, you can:"
    echo "- Open game-launcher.html directly in your browser"
    echo "- Use any other local web server"
    echo ""
}

# Make script executable
chmod +x "$0"

# Try Node.js first (recommended)
if command_exists node && command_exists npm; then
    start_node_server
# Try Python 3
elif command_exists python3; then
    start_python_server python3
# Try Python (might be Python 2 or 3)
elif command_exists python; then
    # Check Python version
    python_version=$(python -c 'import sys; print(sys.version_info.major)')
    if [ "$python_version" -eq 3 ]; then
        start_python_server python
    else
        echo "Python 2 detected, but Python 3 is required."
        show_error
    fi
else
    show_error
fi

echo ""
echo "Thanks for playing First Off!"