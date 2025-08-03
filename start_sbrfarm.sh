#!/bin/bash

# SBRFARM Complete Startup Script
# This script starts the bot, admin dashboard, and cron scheduler

echo "🌾 Starting SBRFARM Complete System..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "Node.js and npm are available"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before continuing"
        print_warning "Required: BOT_TOKEN, payment addresses"
        echo ""
        echo "Press any key to continue after editing .env file..."
        read -n 1 -s
    else
        print_error ".env.example file not found"
        exit 1
    fi
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data
mkdir -p logs
mkdir -p data/backups
print_success "Directories created"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_success "Dependencies already installed"
fi

# Initialize database
print_status "Initializing database..."
node src/database/init.js init
if [ $? -eq 0 ]; then
    print_success "Database initialized"
else
    print_error "Database initialization failed"
    exit 1
fi

# Verify database
print_status "Verifying database..."
node src/database/init.js verify
if [ $? -eq 0 ]; then
    print_success "Database verification passed"
else
    print_warning "Database verification had warnings"
fi

# Function to start a service in background
start_service() {
    local service_name=$1
    local command=$2
    local log_file=$3
    
    print_status "Starting $service_name..."
    
    # Kill existing process if running
    pkill -f "$command" 2>/dev/null
    
    # Start new process
    nohup $command > "$log_file" 2>&1 &
    local pid=$!
    
    # Wait a moment and check if process is still running
    sleep 2
    if kill -0 $pid 2>/dev/null; then
        print_success "$service_name started (PID: $pid)"
        echo $pid > "logs/${service_name,,}.pid"
        return 0
    else
        print_error "$service_name failed to start"
        return 1
    fi
}

# Ask user what to start
echo ""
echo "What would you like to start?"
echo "1) Complete System (Bot + Admin Dashboard + Cron)"
echo "2) Bot Only"
echo "3) Admin Dashboard Only"
echo "4) Cron Scheduler Only"
echo "5) Custom Selection"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        print_status "Starting complete SBRFARM system..."
        
        # Start Telegram Bot
        start_service "Bot" "node src/app.js" "logs/bot.log"
        bot_status=$?
        
        # Start Admin Dashboard
        start_service "Admin" "node src/admin/server.js" "logs/admin.log"
        admin_status=$?
        
        # Start Cron Scheduler
        start_service "Cron" "node src/cron/scheduler.js" "logs/cron.log"
        cron_status=$?
        
        echo ""
        echo "========================================"
        echo "🎉 SBRFARM System Status:"
        echo "========================================"
        [ $bot_status -eq 0 ] && print_success "✅ Telegram Bot: Running" || print_error "❌ Telegram Bot: Failed"
        [ $admin_status -eq 0 ] && print_success "✅ Admin Dashboard: Running (http://localhost:3001)" || print_error "❌ Admin Dashboard: Failed"
        [ $cron_status -eq 0 ] && print_success "✅ Cron Scheduler: Running" || print_error "❌ Cron Scheduler: Failed"
        ;;
        
    2)
        start_service "Bot" "node src/app.js" "logs/bot.log"
        if [ $? -eq 0 ]; then
            print_success "🤖 Telegram Bot is running!"
        fi
        ;;
        
    3)
        start_service "Admin" "node src/admin/server.js" "logs/admin.log"
        if [ $? -eq 0 ]; then
            print_success "📊 Admin Dashboard is running at http://localhost:3001"
        fi
        ;;
        
    4)
        start_service "Cron" "node src/cron/scheduler.js" "logs/cron.log"
        if [ $? -eq 0 ]; then
            print_success "⏰ Cron Scheduler is running!"
        fi
        ;;
        
    5)
        echo ""
        read -p "Start Telegram Bot? (y/n): " start_bot
        read -p "Start Admin Dashboard? (y/n): " start_admin
        read -p "Start Cron Scheduler? (y/n): " start_cron
        
        echo ""
        [ "$start_bot" = "y" ] && start_service "Bot" "node src/app.js" "logs/bot.log"
        [ "$start_admin" = "y" ] && start_service "Admin" "node src/admin/server.js" "logs/admin.log"
        [ "$start_cron" = "y" ] && start_service "Cron" "node src/cron/scheduler.js" "logs/cron.log"
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "📋 Useful Commands:"
echo "========================================"
echo "• View bot logs:       tail -f logs/bot.log"
echo "• View admin logs:     tail -f logs/admin.log"
echo "• View cron logs:      tail -f logs/cron.log"
echo "• Stop all services:   ./stop_sbrfarm.sh"
echo "• Admin dashboard:     http://localhost:3001"
echo "• Database location:   ./data/sbrfarm.db"
echo ""

# Create stop script
cat > stop_sbrfarm.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping SBRFARM services..."

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name,,}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            echo "✅ $service_name stopped"
        else
            echo "⚠️  $service_name was not running"
        fi
        rm -f "$pid_file"
    else
        echo "⚠️  No PID file found for $service_name"
    fi
}

# Stop all services
stop_service "Bot"
stop_service "Admin"
stop_service "Cron"

# Kill any remaining processes
pkill -f "node src/app.js" 2>/dev/null
pkill -f "node src/admin/server.js" 2>/dev/null
pkill -f "node src/cron/scheduler.js" 2>/dev/null

echo "🔴 All SBRFARM services stopped"
EOF

chmod +x stop_sbrfarm.sh

# Show system info
echo "========================================"
echo "🔍 System Information:"
echo "========================================"
echo "• Node.js version:     $(node --version)"
echo "• Platform:            $(uname -s)"
echo "• Architecture:        $(uname -m)"
echo "• Working directory:   $(pwd)"
echo "• Environment:         ${NODE_ENV:-development}"
echo ""

# Show configuration info
if grep -q "BOT_TOKEN=7299803109" .env 2>/dev/null; then
    print_success "✅ Bot token configured"
else
    print_warning "⚠️  Bot token may not be configured"
fi

echo ""
print_success "🌾 SBRFARM startup complete!"
echo ""
echo "Happy farming! 🚜🌱"