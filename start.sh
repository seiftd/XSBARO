#!/bin/bash

# SBRFARM Quick Start Script
# This script helps you get SBRFARM running quickly

echo "🌾 SBRFARM Quick Start Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

print_status "Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

print_status "npm found: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_status "Dependencies already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_info "Please edit .env file with your configuration (especially BOT_TOKEN)"
        print_info "You can get a bot token from @BotFather on Telegram"
    else
        print_error ".env.example file not found"
        exit 1
    fi
else
    print_status ".env file found"
fi

# Create directories if they don't exist
mkdir -p data logs data/backups
print_status "Created necessary directories"

# Initialize database
print_info "Initializing database..."
node src/database/init.js init
if [ $? -eq 0 ]; then
    print_status "Database initialized successfully"
else
    print_error "Failed to initialize database"
    exit 1
fi

# Verify database
print_info "Verifying database..."
node src/database/init.js verify
if [ $? -eq 0 ]; then
    print_status "Database verification passed"
else
    print_error "Database verification failed"
    exit 1
fi

echo ""
echo "🎉 SBRFARM setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your Telegram bot token"
echo "2. Configure payment gateways (optional)"
echo "3. Start the application"
echo ""
echo "🚀 Available commands:"
echo "  npm start          - Start the bot in production mode"
echo "  npm run dev        - Start the bot in development mode"
echo "  npm run admin      - Start the admin dashboard"
echo "  npm run cron       - Start background scheduler"
echo ""
echo "🔧 Development commands:"
echo "  npm test           - Run tests"
echo "  npm run init-db    - Reinitialize database"
echo ""
echo "📚 Documentation:"
echo "  Check README.md for detailed setup instructions"
echo "  Admin dashboard: http://localhost:3001"
echo ""

# Ask if user wants to start the bot now
read -p "Do you want to start the bot now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f ".env" ]; then
        # Check if BOT_TOKEN is configured
        if grep -q "BOT_TOKEN=123456789" .env; then
            print_warning "Please configure your BOT_TOKEN in .env file first!"
            print_info "Get a token from @BotFather on Telegram"
        else
            print_info "Starting SBRFARM bot..."
            npm run dev
        fi
    else
        print_error ".env file not found"
    fi
else
    print_info "You can start the bot later with: npm start"
fi

echo ""
print_status "Happy farming! 🌾"