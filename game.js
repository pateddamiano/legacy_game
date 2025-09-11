// ========================================
// GAME ENTRY POINT
// ========================================
// This file initializes Phaser and starts the game with the new scene flow

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    // New scene order for proper game flow - Start with audio activation
    scene: [
        AudioBootScene,     // Audio activation and essential asset loading
        MainMenuScene,      // Main menu navigation
        CharacterSelectScene, // Character selection
        GameScene           // Actual gameplay (will be refactored)
        // TODO: Add more scenes as we build them:
        // GameIntroScene, VictoryScene, GameOverScene, etc.
    ]
};

// Start the game
console.log('🎮 ===== STARTING PHASER GAME =====');
console.log('🎮 Config:', config);
console.log('🎮 Available scenes:', config.scene.map(s => s.name || s.key || 'Unknown'));

const game = new Phaser.Game(config);

console.log('🎮 ✅ Phaser Game instance created successfully');
console.log('🎮 Game object:', game);
console.log('🚀 Legacy Game started with new scene architecture!'); 