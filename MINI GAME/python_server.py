#!/usr/bin/env python3
"""
First Off - Brooklyn Street Mini Game
Python Development Server
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from urllib.parse import urlparse
import json
import time
import threading

class GameHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler with game-specific features"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def end_headers(self):
        # Add security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        super().end_headers()
    
    def do_GET(self):
        """Handle GET requests with custom routing"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Route handling
        if path == '/':
            self.serve_file('localhost-game.html')
        elif path == '/game':
            self.serve_file('game-launcher.html')
        elif path == '/original':
            self.serve_file('index.html')
        elif path == '/health':
            self.serve_json({
                'status': 'OK',
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                'game': 'First Off - Brooklyn Street Mini Game',
                'version': '1.0.0',
                'server': 'Python'
            })
        elif path == '/api/stats':
            self.serve_json({
                'game': 'First Off',
                'characters': ['Tireek', 'Tryston'],
                'obstacles': ['vinyl', 'gangster', 'homeless'],
                'duration': 180,
                'developed': 'JavaScript Canvas'
            })
        else:
            super().do_GET()
    
    def serve_file(self, filename):
        """Serve a specific file"""
        try:
            if os.path.exists(filename):
                self.path = '/' + filename
                super().do_GET()
            else:
                # Fallback to main game
                self.path = '/game-launcher.html'
                super().do_GET()
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")
    
    def serve_json(self, data):
        """Serve JSON data"""
        json_data = json.dumps(data, indent=2)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(json_data)))
        self.end_headers()
        self.wfile.write(json_data.encode('utf-8'))
    
    def log_message(self, format, *args):
        """Custom log message format"""
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")

def start_server(port=8080, host='localhost'):
    """Start the Python game server"""
    
    print("🎮 FIRST OFF - Brooklyn Street Mini Game Server")
    print("=" * 50)
    print(f"🐍 Python Server starting...")
    
    try:
        with socketserver.TCPServer((host, port), GameHTTPRequestHandler) as httpd:
            server_url = f"http://{host}:{port}"
            
            print(f"🚀 Server running at: {server_url}")
            print(f"🌍 Network access: http://localhost:{port}")
            print("📋 Available routes:")
            print(f"   Main Game: {server_url}/")
            print(f"   Game Launcher: {server_url}/game")
            print(f"   Original Version: {server_url}/original")
            print(f"   Health Check: {server_url}/health")
            print("=" * 50)
            print("Press Ctrl+C to stop the server")
            print("🎯 Ready to play! Opening browser...")
            
            # Open browser after a short delay
            def open_browser():
                time.sleep(1)
                try:
                    webbrowser.open(server_url)
                    print(f"🌐 Browser opened at {server_url}")
                except Exception as e:
                    print(f"⚠️  Could not open browser automatically: {e}")
                    print(f"Please manually open: {server_url}")
            
            browser_thread = threading.Thread(target=open_browser, daemon=True)
            browser_thread.start()
            
            # Start serving
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down First Off game server...")
        print("👋 Thanks for playing!")
    except OSError as e:
        if e.errno == 98 or e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use.")
            print(f"Try a different port: python python_server.py {port + 1}")
        else:
            print(f"❌ Server error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def main():
    """Main function with command line argument handling"""
    port = 8080
    host = 'localhost'
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Invalid port number. Using default port 8080.")
    
    if len(sys.argv) > 2:
        host = sys.argv[2]
    
    # Check if required game files exist
    required_files = ['first-off-game.js', 'game-launcher.html']
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        print("❌ Missing required game files:")
        for file in missing_files:
            print(f"   - {file}")
        print("Please ensure all game files are in the current directory.")
        sys.exit(1)
    
    # Check Python version
    if sys.version_info < (3, 6):
        print("❌ Python 3.6 or higher is required.")
        sys.exit(1)
    
    start_server(port, host)

if __name__ == "__main__":
    main()