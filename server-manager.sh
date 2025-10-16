#!/bin/bash

# NethwinLK Server Manager
# This script helps manage the server process

case "$1" in
    start)
        echo "Starting NethwinLK server..."
        cd /Users/lochgraphy/Desktop/NethwinLK/backend
        npm start &
        echo "Server started in background"
        ;;
    stop)
        echo "Stopping NethwinLK server..."
        # Find and kill the server process
        PID=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $2}')
        if [ ! -z "$PID" ]; then
            kill -9 $PID
            echo "Server stopped (PID: $PID)"
        else
            echo "No server process found"
        fi
        ;;
    restart)
        echo "Restarting NethwinLK server..."
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        PID=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $2}')
        if [ ! -z "$PID" ]; then
            echo "Server is running (PID: $PID)"
            echo "Server URL: http://localhost:4000"
            echo "Frontend URL: http://localhost:4000/html/index.html"
        else
            echo "Server is not running"
        fi
        ;;
    kill-all)
        echo "Killing all node processes..."
        pkill -f "node server.js"
        echo "All server processes killed"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|kill-all}"
        echo ""
        echo "Commands:"
        echo "  start     - Start the server in background"
        echo "  stop      - Stop the server"
        echo "  restart   - Restart the server"
        echo "  status    - Check server status"
        echo "  kill-all  - Kill all server processes"
        exit 1
        ;;
esac
