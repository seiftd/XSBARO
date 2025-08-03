#!/bin/bash

# SBRFARM Web Game Launcher
echo "🌾 SBRFARM Web Game Launcher 🌾"
echo "================================="

# Check if we're in the right directory
if [ ! -f "public/game.html" ]; then
    echo "❌ Error: game.html not found in public directory"
    echo "Please run this script from the SBRFARM project root"
    exit 1
fi

# Start a simple HTTP server
echo "🚀 Starting web server..."

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "Using Python 3 HTTP server on port 8080"
    echo "🌐 Game URL: http://localhost:8080/game.html"
    echo ""
    echo "Press Ctrl+C to stop the server"
    cd public && python3 -m http.server 8080
elif command -v python &> /dev/null; then
    echo "Using Python 2 HTTP server on port 8080"
    echo "🌐 Game URL: http://localhost:8080/game.html"
    echo ""
    echo "Press Ctrl+C to stop the server"
    cd public && python -m SimpleHTTPServer 8080
elif command -v node &> /dev/null; then
    # Check if http-server is installed
    if command -v npx &> /dev/null; then
        echo "Using Node.js http-server on port 8080"
        echo "🌐 Game URL: http://localhost:8080/game.html"
        echo ""
        echo "Press Ctrl+C to stop the server"
        cd public && npx http-server -p 8080
    else
        echo "❌ No suitable web server found"
        echo "Please install Python or Node.js to run the web server"
        exit 1
    fi
else
    echo "❌ No suitable web server found"
    echo "Please install Python or Node.js to run the web server"
    echo ""
    echo "Alternative: Open public/game.html directly in your browser"
    echo "(Note: Some features may not work due to CORS restrictions)"
    exit 1
fi