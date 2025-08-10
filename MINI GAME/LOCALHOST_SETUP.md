# 🚀 First Off Game - Localhost Setup Guide

Welcome to the complete localhost setup for the "First Off" Brooklyn Street Mini Game! This guide will help you run the game on your local development server.

## 🎯 Quick Start (Easiest)

### Windows Users:
```bash
# Simply double-click this file:
start-game.bat
```

### Mac/Linux Users:
```bash
# Make executable and run:
chmod +x start-game.sh
./start-game.sh
```

The script will automatically:
- ✅ Detect Node.js or Python
- ✅ Install dependencies if needed
- ✅ Start the appropriate server
- ✅ Open your browser to http://localhost:8080

## 📋 Server Options

### Option 1: Node.js Server (Recommended)

**Prerequisites:**
- Node.js 14+ and npm installed

**Setup:**
```bash
# Install dependencies
npm install

# Start development server
npm start

# Alternative: Start with nodemon (auto-restart)
npm run dev
```

**Features:**
- ✅ Express.js with security headers
- ✅ CORS enabled for localhost
- ✅ Gzip compression
- ✅ Custom routing
- ✅ Health check endpoint
- ✅ Hot reload support

### Option 2: Python Server

**Prerequisites:**
- Python 3.6+ installed

**Setup:**
```bash
# Using custom Python server (recommended)
python python_server.py

# Or using Python 3
python3 python_server.py

# Simple HTTP server (basic)
python -m http.server 8080
```

**Features:**
- ✅ Custom routing and error handling
- ✅ CORS headers for localhost
- ✅ JSON API endpoints
- ✅ Auto browser opening
- ✅ Security headers

## 🌐 Access Points

Once the server is running, access your game at:

| Route | Description |
|-------|-------------|
| `http://localhost:8080/` | Main game (localhost-optimized) |
| `http://localhost:8080/game` | Game launcher version |
| `http://localhost:8080/original` | Original index.html |
| `http://localhost:8080/health` | Server health check |
| `http://localhost:8080/api/stats` | Game statistics API |

## 🔧 Development Features

The localhost version includes special development features:

### Development Header
- 🟢 **Server Status**: Real-time server connection
- 🎮 **Game State**: Current game state monitoring
- 📍 **URL Display**: Current localhost URL
- 🔧 **Dev Mode**: Development environment indicator

### Performance Monitoring
- **FPS Counter**: Real-time frame rate display
- **Memory Usage**: JavaScript heap usage
- **Resolution Display**: Current canvas resolution
- **Server Health**: Automatic server status checks

### Debug Features
- **Info Panel**: Toggle with `H` key or Info button
- **Console Logging**: Detailed development logs
- **Error Handling**: Enhanced error messages and recovery
- **Hot Reload**: Automatic refresh on certain errors

### Development Controls
| Key | Action |
|-----|--------|
| `H` | Toggle info panel |
| `Ctrl+R` | Reload game |
| `F12` | Open developer tools |

## 📁 File Structure

```
mini-game++/
├── 📄 localhost-game.html      # Localhost-optimized game page
├── 📄 first-off-game.js        # Complete game engine
├── 📄 server.js                # Node.js Express server
├── 📄 python_server.py         # Python development server
├── 📄 package.json             # Node.js dependencies
├── 📜 start-game.bat           # Windows startup script
├── 📜 start-game.sh            # Mac/Linux startup script
├── 📄 game-launcher.html       # Alternative game launcher
├── 📄 index.html               # Original game file
└── 📄 LOCALHOST_SETUP.md       # This guide
```

## 🛠️ Troubleshooting

### Server Won't Start

**Port 8080 already in use:**
```bash
# Try different port
node server.js # Uses PORT environment variable
# Or
python python_server.py 8081
```

**Node.js not found:**
```bash
# Install Node.js from https://nodejs.org
# Then run:
npm install
npm start
```

**Python not found:**
```bash
# Install Python from https://python.org
# Make sure Python 3.6+ is installed
python --version
```

### Game Won't Load

**Check browser console (F12) for errors:**
- Ensure all game files are present
- Check network tab for failed requests
- Verify JavaScript is enabled

**Clear browser cache:**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear cache in browser settings

**File permissions (Mac/Linux):**
```bash
chmod +x start-game.sh
chmod 644 *.html *.js *.json
```

### Performance Issues

**Low FPS (< 30):**
- Close other browser tabs
- Disable browser extensions
- Check CPU usage
- Try different browser (Chrome recommended)

**Memory issues:**
- Check performance monitor
- Restart browser if memory > 200MB
- Close unnecessary applications

## 🔍 Server API Endpoints

### Health Check
```bash
curl http://localhost:8080/health
```
Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01 12:00:00",
  "game": "First Off - Brooklyn Street Mini Game",
  "version": "1.0.0"
}
```

### Game Statistics
```bash
curl http://localhost:8080/api/stats
```
Response:
```json
{
  "game": "First Off",
  "characters": ["Tireek", "Tryston"],
  "obstacles": ["vinyl", "gangster", "homeless"],
  "duration": 180,
  "developed": "JavaScript Canvas"
}
```

## 🚀 Advanced Configuration

### Environment Variables

**Node.js server:**
```bash
# Custom port and host
PORT=3000 HOST=0.0.0.0 npm start

# Enable development logging
NODE_ENV=development npm start
```

**Python server:**
```bash
# Custom port
python python_server.py 3000

# Custom host and port
python python_server.py 3000 0.0.0.0
```

### Network Access

**Allow network access (other devices on local network):**

**Node.js:**
```bash
HOST=0.0.0.0 npm start
```

**Python:**
```bash
python python_server.py 8080 0.0.0.0
```

Then access from other devices using your computer's IP:
`http://192.168.1.xxx:8080`

## 📱 Mobile Development

**Test on mobile devices:**

1. Start server with network access (above)
2. Find your computer's IP address:
   - Windows: `ipconfig`
   - Mac: `ifconfig`
   - Linux: `ip addr show`
3. Access `http://YOUR_IP:8080` from mobile browser

**Mobile debugging:**
- Use Chrome DevTools for mobile debugging
- Enable USB debugging for Android
- Use Safari Web Inspector for iOS

## 🔐 Security Notes

**Development server security:**
- ✅ CORS headers configured for localhost
- ✅ Content Security Policy headers
- ✅ XSS protection headers
- ⚠️ Only for development - not production ready

**Network access security:**
- Only enable network access on trusted networks
- Firewall may block incoming connections
- Consider using HTTPS for production

## 🎮 Game Development

**Modify the game:**
1. Edit `first-off-game.js` for game logic changes
2. Edit `localhost-game.html` for UI changes
3. Server automatically serves updated files
4. Hard refresh browser to see changes

**Debug the game:**
1. Open browser developer tools (F12)
2. Check console for game logs
3. Use performance tab for FPS analysis
4. Network tab shows file loading

## 📊 Performance Optimization

**Server optimizations:**
- Gzip compression enabled
- Cache headers configured
- Static file serving optimized
- Security headers minimize overhead

**Game optimizations:**
- Canvas rendering optimized
- Particle systems efficient
- Collision detection optimized
- Memory management included

---

## 🎯 Ready to Play!

Choose your setup method and start playing:

1. **Easy:** Double-click `start-game.bat` (Windows) or run `./start-game.sh` (Mac/Linux)
2. **Node.js:** `npm install && npm start`
3. **Python:** `python python_server.py`

Game will be available at: **http://localhost:8080**

Happy gaming and development! 🎮✨