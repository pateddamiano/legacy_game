const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Enable CORS for local development
app.use(cors({
    origin: [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`, `http://${HOST}:${PORT}`],
    credentials: true
}));

// Enable gzip compression
app.use(compression());

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname), {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath, stat) => {
        // Set proper MIME types
        if (filePath.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.html')) {
            res.set('Content-Type', 'text/html');
        } else if (filePath.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        } else if (filePath.endsWith('.json')) {
            res.set('Content-Type', 'application/json');
        }
        
        // Add cache control for game assets
        if (filePath.includes('first-off-game.js') || filePath.includes('game.js')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// Route for main game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'localhost-game.html'));
});

// Alternative routes
app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game-launcher.html'));
});

app.get('/original', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        game: 'First Off - Brooklyn Street Mini Game',
        version: '1.0.0'
    });
});

// Game statistics endpoint (for potential future features)
app.get('/api/stats', (req, res) => {
    res.json({
        game: 'First Off',
        characters: ['Tireek', 'Tryston'],
        obstacles: ['vinyl', 'gangster', 'homeless'],
        duration: 180,
        developed: 'JavaScript Canvas'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Game server encountered an error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'localhost-game.html'));
});

// Start server
app.listen(PORT, HOST, () => {
    console.log('🎮 FIRST OFF - Brooklyn Street Mini Game Server');
    console.log('================================================');
    console.log(`🚀 Server running at: http://${HOST}:${PORT}`);
    console.log(`🌍 Network access: http://localhost:${PORT}`);
    console.log('📋 Available routes:');
    console.log(`   Main Game: http://${HOST}:${PORT}/`);
    console.log(`   Game Launcher: http://${HOST}:${PORT}/game`);
    console.log(`   Original Version: http://${HOST}:${PORT}/original`);
    console.log(`   Health Check: http://${HOST}:${PORT}/health`);
    console.log('================================================');
    console.log('Press Ctrl+C to stop the server');
    console.log('🎯 Ready to play! Open the URL in your browser.');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down First Off game server...');
    console.log('👋 Thanks for playing!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminated');
    process.exit(0);
});