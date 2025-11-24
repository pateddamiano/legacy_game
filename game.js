// ========================================
// GAME ENTRY POINT
// ========================================
// This file initializes Phaser and starts the game with the new scene flow

// ========================================
// DEBUG MODE DETECTION
// ========================================
const urlParams = new URLSearchParams(window.location.search);
window.DEBUG_MODE = urlParams.get('debug') === 'true' || urlParams.get('test') === 'true';
window.TEST_LEVEL_ID = urlParams.get('level') ? parseInt(urlParams.get('level'), 10) : null;
window.DIRECT_LEVEL_LOAD = window.DEBUG_MODE && window.TEST_LEVEL_ID;

// Debug logging
console.log('🔍 URL Parameters:', {
    debug: urlParams.get('debug'),
    test: urlParams.get('test'),
    level: urlParams.get('level'),
    allParams: Object.fromEntries(urlParams)
});

if (window.DEBUG_MODE) {
    console.log('%c🧪 DEBUG MODE ENABLED', 'color: #00ff00; font-weight: bold; font-size: 16px;');
    console.log('Debug mode:', window.DEBUG_MODE);
    console.log('Test level ID:', window.TEST_LEVEL_ID);
    console.log('Direct level load:', window.DIRECT_LEVEL_LOAD);
    console.log('Full URL:', window.location.href);
} else {
    console.log('🧪 Debug mode: OFF');
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.NO_CENTER,
        fullscreenTarget: 'game-container' // Enable fullscreen on the game container
    },
    parent: 'game-container',
    backgroundColor: '#000000', // Black background for letterboxing
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    // New scene order for proper game flow - Start with audio activation
    scene: [
        AudioBootScene,      // Audio activation and essential asset loading
        MainMenuScene,       // Main menu navigation
        IntroDialogueScene,  // Story intro before gameplay
        UIScene,             // UI Overlay (always active on top of game)
        GameScene            // Actual gameplay with dynamic character switching
        // TODO: Add more scenes as we build them:
        // VictoryScene, GameOverScene, etc.
    ]
};

// Start the game
console.log('🎮 ===== STARTING PHASER GAME =====');
console.log('🎮 Config:', config);
console.log('🎮 Available scenes:', config.scene.map(s => s.name || s.key || 'Unknown'));

const game = new Phaser.Game(config);

// Initialize Device Manager
if (window.DeviceManager) {
    window.DeviceManager.initialize(game);
}

// Initialize Fullscreen Manager
if (window.FullscreenManager) {
    window.FullscreenManager.initialize(game);
}

console.log('🎮 ✅ Phaser Game instance created successfully');
console.log('🎮 Game object:', game);
console.log('🚀 Legacy Game started with new scene architecture!'); 
